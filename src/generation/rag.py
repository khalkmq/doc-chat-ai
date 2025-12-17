import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

from crewai import LLM
from src.vector_database.milvus_vector_db import MilvusVectorDB
from src.embeddings.embedding_generator import EmbeddingGenerator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class RAGResult:
    """Represents the result of RAG generation with citations"""
    query: str
    response: str
    sources_used: List[Dict[str, Any]]
    retrieval_count: int
    generation_tokens: Optional[int] = None
    
    def get_citation_summary(self) -> str:
        if not self.sources_used:
            return "No sources cited"
        
        source_summary = []
        for source in self.sources_used:
            source_info = f"• {source.get('source_file', 'Unknown')} ({source.get('source_type', 'unknown')})"
            if source.get('page_number'):
                source_info += f" - Page {source['page_number']}"
            source_summary.append(source_info)
        
        return "\n".join(source_summary)


class RAGGenerator:
    def __init__(
        self,
        embedding_generator: EmbeddingGenerator,
        vector_db: MilvusVectorDB,
        openai_api_key: str = None,
        openrouter_api_key: str = None,
        model_name: str = "gpt-4o-mini",
        temperature: float = 0.1,
        max_tokens: int = 2000
    ):
        self.embedding_generator = embedding_generator
        self.vector_db = vector_db
        self.openai_api_key = openai_api_key
        self.openrouter_api_key = openrouter_api_key
        self.temperature = temperature
        self.max_tokens = max_tokens
        
        # Determine which API to use for default LLM
        if openrouter_api_key:
            api_key = openrouter_api_key
            api_base = "https://openrouter.ai/api/v1"
            model_with_prefix = f"openrouter/{model_name}" if "/" not in model_name else model_name
        elif openai_api_key:
            api_key = openai_api_key
            api_base = None
            model_with_prefix = f"openai/{model_name}" if "/" not in model_name else model_name
        else:
            raise ValueError("Either OpenAI or OpenRouter API key must be provided")
        
        # GPT-5 models use max_completion_tokens instead of max_tokens
        llm_params = {
            "model": model_with_prefix,
            "api_key": api_key,
            "base_url": api_base
        }
        
        # GPT-5 models have different parameter requirements
        if self._is_gpt5_model(model_name):
            llm_params["max_completion_tokens"] = max_tokens
            llm_params["temperature"] = 1  # GPT-5 only supports temperature=1
        else:
            llm_params["max_tokens"] = max_tokens
            llm_params["temperature"] = temperature
        
        self.llm = LLM(**llm_params)
        
        self.model_name = model_name
        logger.info(f"RAG Generator initialized with {model_name} via {'OpenRouter' if openrouter_api_key else 'OpenAI'}")
    
    def _is_gpt5_model(self, model_name: str) -> bool:
        """Check if the model is a GPT-5 series model"""
        model_lower = model_name.lower()
        return 'gpt-5' in model_lower or 'gpt5' in model_lower
    
    def generate_response(
        self,
        query: str,
        max_chunks: int = 8,
        max_context_chars: int = 4000,
        top_k: int = 10,
        model: str = None
    ) -> RAGResult:

        if not query.strip():
            return RAGResult(
                query=query,
                response="Please provide a valid question.",
                sources_used=[],
                retrieval_count=0
            )
        
        try:
            logger.info(f"Generating response for: '{query[:50]}...'")
            
            # Step 1: Retrieve relevant chunks
            query_vector = self.embedding_generator.generate_query_embedding(query)
            search_results = self.vector_db.search(
                query_vector=query_vector.tolist(),
                limit=top_k
            )
            
            if not search_results:
                return RAGResult(
                    query=query,
                    response="I couldn't find any relevant information in the available documents to answer your question.",
                    sources_used=[],
                    retrieval_count=0
                )
            
            # Step 2: Format context with citations
            context, sources_info = self._format_context_with_citations(
                search_results, max_chunks, max_context_chars
            )
            
            # Step 3: Create citation-aware prompt
            prompt = self._create_rag_prompt(query, context)
            
            # Step 4: Generate response with specified model
            if model:
                # Determine which API to use based on model ID
                # Models with "/" are OpenRouter models
                # Models without "/" are direct OpenAI models
                if "/" in model:
                    # OpenRouter model
                    if not self.openrouter_api_key:
                        return RAGResult(
                            query=query,
                            response="This model requires an OpenRouter API key. Please configure it in Settings.",
                            sources_used=[],
                            retrieval_count=0
                        )
                    api_key = self.openrouter_api_key
                    api_base = "https://openrouter.ai/api/v1"
                    model_str = f"openrouter/{model}"
                else:
                    # Direct OpenAI model
                    if not self.openai_api_key:
                        return RAGResult(
                            query=query,
                            response="This model requires an OpenAI API key. Please configure it in Settings.",
                            sources_used=[],
                            retrieval_count=0
                        )
                    api_key = self.openai_api_key
                    api_base = None
                    model_str = f"openai/{model}"
                
                # GPT-5 models use max_completion_tokens instead of max_tokens
                llm_params = {
                    "model": model_str,
                    "api_key": api_key,
                    "base_url": api_base
                }
                
                # GPT-5 models have different parameter requirements
                if self._is_gpt5_model(model):
                    llm_params["max_completion_tokens"] = self.max_tokens
                    llm_params["temperature"] = 1  # GPT-5 only supports temperature=1
                else:
                    llm_params["max_tokens"] = self.max_tokens
                    llm_params["temperature"] = self.temperature
                
                llm_for_request = LLM(**llm_params)
                response = llm_for_request.call(prompt)
                logger.info(f"Generated response with model: {model} via {'OpenRouter' if '/' in model else 'OpenAI Direct'}")
            else:
                response = self.llm.call(prompt)
            
            # Step 5: Create result object
            rag_result = RAGResult(
                query=query,
                response=response,
                sources_used=sources_info,
                retrieval_count=len(search_results)
            )
            
            logger.info(f"Response generated successfully using {len(sources_info)} sources")
            return rag_result
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return RAGResult(
                query=query,
                response=f"I encountered an error while processing your question: {str(e)}",
                sources_used=[],
                retrieval_count=0
            )
    
    def _format_context_with_citations(
        self,
        search_results: List[Dict[str, Any]],
        max_chunks: int,
        max_context_chars: int
    ) -> Tuple[str, List[Dict[str, Any]]]:

        # Group chunks by source document
        source_map = {}  # source_file -> {'chunks': [], 'info': {}}
        
        for result in search_results[:max_chunks]:
            citation_info = result['citation']
            source_file = citation_info.get('source_file', 'Unknown Source')
            
            if source_file not in source_map:
                source_map[source_file] = {
                    'chunks': [],
                    'info': {
                        'source_file': source_file,
                        'source_type': citation_info.get('source_type', 'unknown'),
                        'page_number': citation_info.get('page_number'),
                        'url': citation_info.get('url')
                    }
                }
            
            source_map[source_file]['chunks'].append({
                'content': result['content'],
                'score': result['score'],
                'id': result['id']
            })
        
        # Build context with source-level citations
        context_parts = []
        sources_info = []
        total_chars = 0
        
        for i, (source_file, data) in enumerate(source_map.items()):
            citation_ref = f"[{i+1}]"
            
            # Combine chunks from same source
            source_chunks = []
            for chunk in data['chunks']:
                if total_chars + len(chunk['content']) > max_context_chars:
                    break
                source_chunks.append(chunk['content'])
                total_chars += len(chunk['content'])
            
            if source_chunks:
                # Add source reference to each chunk
                source_text = f"{citation_ref} (Source: {source_file})\n" + "\n".join(source_chunks)
                context_parts.append(source_text)
                
                # Add to sources list
                source_info = data['info'].copy()
                source_info['reference'] = citation_ref
                source_info['chunk_count'] = len(source_chunks)
                sources_info.append(source_info)
        
        formatted_context = '\n\n'.join(context_parts)

        return formatted_context, sources_info
    
    def _create_rag_prompt(self, query: str, context: str) -> str:
        prompt = f"""You are an AI assistant that answers questions based on provided source material. You must follow these citation rules:

CITATION REQUIREMENTS:
1. For each factual claim in your answer, include the citation reference number in square brackets [1], [2], etc.
2. Only use information from the provided context - do not add external knowledge
3. If you cannot find relevant information in the context, say so clearly
4. Be precise and accurate in your citations
5. When multiple sources support the same point, list all relevant citations like this [1], [2], [3].

CONTEXT (with citation references):
{context}

QUESTION: {query}

Please provide a comprehensive answer with proper citations. Make sure every factual statement is supported by a citation reference."""
        
        return prompt
    
    def generate_summary(
        self,
        max_chunks: int = 15,
        summary_length: str = "medium"
    ) -> RAGResult:
        try:
            summary_query = "main topics key findings important information overview"
            query_vector = self.embedding_generator.generate_query_embedding(summary_query)
            search_results = self.vector_db.search(
                query_vector=query_vector.tolist(),
                limit=max_chunks
            )
            
            if not search_results:
                return RAGResult(
                    query="Document Summary",
                    response="No documents available for summarization.",
                    sources_used=[],
                    retrieval_count=0
                )
            
            context, sources_info = self._format_context_with_citations(
                search_results, max_chunks, 6000
            )
            
            length_instructions = {
                'short': "Provide a concise 2-3 paragraph summary highlighting the most important points.",
                'medium': "Provide a comprehensive 4-5 paragraph summary covering key topics and findings.",
                'long': "Provide a detailed summary with multiple sections covering all major topics and supporting details."
            }
            
            summary_prompt = f"""You are tasked with creating a summary of the provided document content. Follow these guidelines:

1. {length_instructions.get(summary_length, length_instructions['medium'])}
2. Include citations [1], [2], etc. for all factual claims
3. Organize information logically with clear topics
4. Focus on the most important and relevant information
5. Maintain accuracy and cite sources properly

DOCUMENT CONTENT (with citation references):
{context}

Please provide a well-structured summary with proper citations:"""
            
            response = self.llm.call(summary_prompt)
            
            return RAGResult(
                query="Document Summary",
                response=response,
                sources_used=sources_info,
                retrieval_count=len(search_results)
            )
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            return RAGResult(
                query="Document Summary",
                response=f"Error generating summary: {str(e)}",
                sources_used=[],
                retrieval_count=0
            )


if __name__ == "__main__":
    import os
    from src.document_processing.doc_processor import DocumentProcessor
    from src.embeddings.embedding_generator import EmbeddingGenerator
    from src.vector_database.milvus_vector_db import MilvusVectorDB
    
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("Please set OPENAI_API_KEY environment variable")
        exit(1)
    
    try:
        embedding_gen = EmbeddingGenerator()
        vector_db = MilvusVectorDB()
        rag_generator = RAGGenerator(
            embedding_generator=embedding_gen,
            vector_db=vector_db,
            openai_api_key=openai_key,
            model_name="gpt-4o-mini",
            temperature=0.1
        )
        
        test_query = "What are the main findings discussed in the documents?"
        result = rag_generator.generate_response(test_query)
        
        print(f"Query: {result.query}")
        print(f"Response: {result.response}")
        print(f"\nSources Used ({len(result.sources_used)}):")
        print(result.get_citation_summary())
        
        summary_result = rag_generator.generate_summary(summary_length="medium")
        print(f"\nDocument Summary:")
        print(summary_result.response)
        
    except Exception as e:
        print(f"Error in RAG pipeline example: {e}")