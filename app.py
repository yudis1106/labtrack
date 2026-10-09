from pathlib import Path

from flask import send_from_directory

from python.labtrack import app

ROOT = Path(__file__).resolve().parent


# Sajikan logo LabTrack terbaru melalui endpoint tetap agar nama file dengan spasi
# tidak membuat pemanggilan asset bermasalah di browser/Vercel.
def serve_labtrack_logo():
    return send_from_directory(
        ROOT / "assets",
        "Glossy Teal PLC Automation Icon.png",
        mimetype="image/png",
    )


app.view_functions["logo_labtrack_image"] = serve_labtrack_logo


if __name__ == "__main__":
    app.run(debug=True)
