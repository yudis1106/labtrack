from flask import send_from_directory

from python.labtrack import app


# Override endpoint logo lama agar langsung mengirim PNG asli yang valid.
def serve_labtrack_logo():
    return send_from_directory("assets", "labstrack_exact_512.png", mimetype="image/png")


app.view_functions["logo_labtrack_image"] = serve_labtrack_logo


if __name__ == "__main__":
    app.run(debug=True)
