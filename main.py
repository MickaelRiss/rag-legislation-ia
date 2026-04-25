import httpx
from app.services.vector import get_retriever
from app.services.agent import build_chain, answer_question


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
            result = answer_question(
                question=question,
                session_id="cli-default",
                retriever=retriever,
                chain=chain,
            )
            print("\n--- Réponse ---")
            print(result["answer"])
            print(f"\n--- Sources ({len(result['sources'])} documents) ---")
            for i, src in enumerate(result["sources"], 1):
                print(f"\n[{i}] {src['metadata']}")
            print()
        except Exception as e:
            print(f"Erreur inattendue : {e}\n")


if __name__ == "__main__":
    main()
