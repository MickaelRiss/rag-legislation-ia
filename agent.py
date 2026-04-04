import httpx
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from config import MODEL_NAME

SYSTEM_PROMPT = (
    "Tu es un assistant juridique spécialisé dans la législation européenne et française "
    "sur l'intelligence artificielle. Tu réponds exclusivement à partir des documents "
    "législatifs fournis dans le contexte : AI Act (Règlement UE 2024/1689), RGPD "
    "(Règlement UE 2016/679), recommandations CNIL, avis EDPB, et Convention-cadre "
    "du Conseil de l'Europe.\n\n"
    "Règles strictes :\n"
    "- Cite systématiquement les sources précises (numéro d'article, nom du texte, institution).\n"
    "- Si l'information ne figure pas dans les documents fournis, dis-le clairement. "
    "N'invente jamais une réponse.\n"
    "- Distingue ce qui est une obligation légale, une recommandation, ou une interprétation "
    "d'une autorité (CNIL, EDPB).\n"
    "- Si plusieurs textes traitent du même sujet, croise les sources et signale "
    "les complémentarités ou différences.\n"
    "- Réponds dans la langue de la question posée.\n"
    "- Structure ta réponse de manière claire et pédagogique, adaptée à un professionnel "
    "non juriste."
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
