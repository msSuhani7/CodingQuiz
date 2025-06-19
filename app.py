from flask import Flask, render_template, request, jsonify, session
import google.generativeai as genai
import os
import json
import re  # For extracting JSON from AI response

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Secure session handling

# Load Google API Key
google_api_key = os.getenv("GOOGLE_API_KEY")
if not google_api_key:
    raise ValueError("Missing Google API Key. Set GOOGLE_API_KEY in your environment.")

# Configure Google Generative AI
genai.configure(api_key=google_api_key)


def extract_json(text):
    """Extract JSON content from AI response."""
    match = re.search(r"```json\n(.*?)\n```", text, re.DOTALL)
    return match.group(1) if match else text  # Use extracted JSON if found


def generate_questions(language, level):
    """Generate programming questions dynamically using Google Gemini AI."""

    default_questions = [
        {
            "question": f"What is the basic syntax for printing in {language}?",
            "options": [
                "System.out.println()",
                "print()",
                "console.log()",
                "None of the above",
            ],
            "answer": (
                "print()" if language == "Python"
                else "System.out.println()" if language == "Java"
                else "console.log()" if language == "JavaScript"
                else "None of the above"
            ),
        }
    ]

    try:
        prompt = f"""
        Generate 10 multiple-choice programming questions for {language} 
        at difficulty level {level}. Each question should have:
        - A clear, concise question text.
        - 4 multiple-choice options (A, B, C, D).
        - The correct answer.

        Respond **only** with a valid JSON in the following format:
        ```json
        [
            {{"question": "Example question?", "options": ["A", "B", "C", "D"], "answer": "A"}},
            ...
        ]
        ```
        """

        model = genai.GenerativeModel("gemini-1.5-pro")  # Use Gemini Pro model
        response = model.generate_content(prompt)

        # Extract and parse JSON from AI response
        raw_text = response.text.strip()
        json_text = extract_json(raw_text)

        try:
            questions = json.loads(json_text)

            # Validate response structure
            if not isinstance(questions, list) or not all("question" in q and "options" in q and "answer" in q for q in questions):
                raise ValueError("Invalid response format")

            return questions

        except json.JSONDecodeError:
            print("Error: AI response is not valid JSON. Using default questions.")
            return default_questions

    except Exception as e:
        print(f"Error generating questions: {e}")
        return default_questions


@app.route("/")
def index():
    """Render the main application page"""
    return render_template("index.html")


@app.route("/start_quiz", methods=["POST"])
def start_quiz():
    """Start the quiz and return generated questions"""
    data = request.json
    language = data.get("language")
    level = data.get("level", 1)
    username = data.get("username")

    if not language or not username:
        return jsonify({"error": "Missing language or username"}), 400

    questions = generate_questions(language, level)

    # Store quiz details in session
    session["current_quiz"] = {
        "language": language,
        "level": level,
        "username": username,
    }

    return jsonify({"questions": questions, "language": language, "level": level})


if __name__ == "__main__":
    app.run(debug=True)
