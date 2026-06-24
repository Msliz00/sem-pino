from pyrogram import Client

api_id = 32384023
api_hash = "5eda21e68be6cfc54ad946a3b8480bbb"

with Client("gerar_session", api_id=api_id, api_hash=api_hash, in_memory=True) as app:
    session_string = app.export_session_string()
    print("\nSua SESSION STRING do Pyrogram:\n")
    print(session_string)
    print("\nGuarde-a em local seguro. Nunca compartilhe com ninguem.")
