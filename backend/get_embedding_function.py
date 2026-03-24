from langchain_community.embeddings.ollama import OllamaEmbeddings
from langchain_community.embeddings.bedrock import BedrockEmbeddings

def get_embedding_function(model_name="mxbai-embed-large:latest", use_bedrock=False):
    """
    Returns the embedding function based on the selected model.
    
    Args:
        model_name (str): Name of the model for embeddings (default: "llama2").
        use_bedrock (bool): If True, use Bedrock embeddings instead of Ollama.

    Returns:
        embeddings: The selected embedding function.
    """
    try:
        if use_bedrock:
            print(f"🔹 Using Bedrock embeddings...")
            return BedrockEmbeddings(
                credentials_profile_name="default", 
                region_name="us-east-1"
            )
        else:
            print(f"🔹 Using Ollama embeddings with model: {model_name}")
            return OllamaEmbeddings(model=model_name)
    except Exception as e:
        print(f"❌ Error initializing embeddings: {e}")
        return None
