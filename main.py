import httpx
from vector import get_retriever
from agent import build_chain


def main():
    try:
        retriever = get_retriever()
    except FileNotFoundError as e:
        print(f"Erreur: fichier introuvable - {e}")
        return
    except httpx.ConnectError:
        print(
            "Erreur : impossible de se connecter à Ollama. "
            "Vérifiez qu'Ollama est lancé avec 'ollama serve'."
        )
        return

    chain = build_chain()

    while True:
        question = input("Quelle est votre question ? (tapez 'q' pour quitter): ")
        if question.strip().lower() == "q":
            break

        try:
            documents = retriever.invoke(question)
            result = chain.invoke(
                {
                    "documents": "\n\n".join(doc.page_content for doc in documents),
                    "question": question,
                },
                config={"configurable": {"session_id": "default"}},
            )
            print(result)
        except Exception as e:
            print(f"Erreur inattendue : {e}\n")


if __name__ == "__main__":
    main()
