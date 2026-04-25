from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from app.config import MODEL_NAME

SYSTEM_PROMPT = (
    "Tu es un assistant juridique spécialisé dans la législation européenne et française "
    "sur l'intelligence artificielle. Tu réponds exclusivement à partir des documents "
    "législatifs fournis dans le contexte.\n\n"
    "Règles strictes :\n"
    "- Base ta réponse UNIQUEMENT sur les extraits de documents fournis ci-dessous. "
    "Ne complète JAMAIS avec tes propres connaissances.\n"
    "- Si les documents fournis ne contiennent pas la réponse complète, dis-le explicitement "
    "et cite ce que les documents contiennent sur le sujet.\n"
    "- Cite systématiquement les sources précises (numéro d'article ou de considérant, nom du texte).\n"
    "- Ne confonds JAMAIS le RGPD et l'AI Act. Ce sont deux textes distincts.\n"
    "- Distingue ce qui est une obligation légale, une recommandation, ou une interprétation "
    "d'une autorité (CNIL, EDPB).\n"
    "- Réponds dans la langue de la question posée.\n"
    "- Structure ta réponse de manière claire et pédagogique."
)

store = {}


# Get or create historic
def get_session_history(session_id: str) -> InMemoryChatMessageHistory:
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]


def build_chain():
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            MessagesPlaceholder(variable_name="history"),
            (
                "human",
                "Voici les documents législatifs pertinents :\n\n{documents}\n\n"
                "Question : {question}",
            ),
        ]
    )

    chain = prompt | ChatOllama(model=MODEL_NAME) | StrOutputParser()

    return RunnableWithMessageHistory(
        chain,
        get_session_history,
        input_messages_key="question",
        history_messages_key="history",
    )


def answer_question(
    question: str,
    session_id: str,
    retriever,
    chain,
) -> dict:
    """
    Orchestre le RAG : récupère les documents pertinents puis interroge le LLM.

    Args:
        question: la question de l'utilisateur
        session_id: identifiant de conversation (pour l'historique)
        retriever: l'objet retriever ChromaDB (déjà initialisé)
        chain: la chaîne LangChain (déjà initialisée)

    Returns:
        dict avec 'answer' (str) et 'sources' (list de dicts)
    """
    # 1. Retrieval : on va chercher les documents pertinents dans ChromaDB
    documents = retriever.invoke(question)

    # 2. Generation : on passe les documents au LLM avec la question
    answer = chain.invoke(
        {
            "documents": "\n\n".join(doc.page_content for doc in documents),
            "question": question,
        },
        config={"configurable": {"session_id": session_id}},
    )

    # 3. On formate les sources pour que le frontend puisse les afficher
    sources = [
        {
            "content": doc.page_content,
            "metadata": doc.metadata,
        }
        for doc in documents
    ]

    return {"answer": answer, "sources": sources}
