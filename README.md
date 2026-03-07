# 🛠️ Base64 to Media Converter (High Performance)

A specialized, high-performance web application designed for developers and power users to convert **Base64 strings** into images or videos. Unlike standard online converters, this tool is built to handle heavy data without crashing your browser.

---

## 🌟 Why this exists

Most online converters fail when dealing with real-world development workflows. I built this to solve two specific pain points:

1.  **Large File Stability:** Standard tools often freeze or "hang" the browser tab when processing 4K images or large video files in Base64. This tool uses optimized memory handling to keep the UI responsive.
2.  **JSON-Nested Data:** Developers often deal with Base64 strings tucked inside complex JSON objects. Instead of manually cleaning the string, you can paste the **entire JSON**. The sidebar allows you to navigate the schema and pick exactly which block you want to convert.

---

## 🚀 Features

- **Zero-Lag Processing:** Built to handle high-resolution images and video files without memory leaks.
- **JSON Schema Navigator:** Interactive sidebar to extract Base64 from nested JSON structures.
- **Client-Side Privacy:** Your data never leaves your machine. All processing happens locally in your browser.
- **Format Support:** Optimized for JPG, PNG, GIF, MP4, WebM, and more.

---

## 🛠️ Installation & Local Setup

Running the tool locally ensures maximum speed and allows you to use it offline.

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Abdur-Rahim-sheikh/base64_studio.git
    ```

2.  **Navigate to the directory:**

    ```bash
    cd base64_studio
    ```

3.  **Run with a local server:**
    Since this is a static webapp, you can use any local server. If you have Python installed, run:
    ```bash
    # Python 3
    python -m http.server 8000
    ```
    Or, if you prefer with node
    ```bash
    npx serve .
    ```
    Now visit `http://localhost:8000` in your browser.

---

## 💡 Share a Suggestion

I am building this tool as part of a larger mission to create essential, free utilities for developers, educators, and small business owners.

If you have a "technical headache" you want solved—like a specific JSON parser or a batch media tool—I want to hear about it:

- **In-App:** Use the **"Share an idea"** banner at the bottom of the page to send a suggestion directly to me.
- **GitHub:** Open an [issue](https://github.com/Abdur-Rahim-sheikh/base64_studio/issues) for bug reports or feature requests.

---

## 🛡️ Privacy & Security

Data privacy is a priority. This app uses the **FileReader API** and **URL.createObjectURL** to process everything in your browser's memory. No data is ever uploaded to a server.

---

## 👤 Author

**Abdur Rahim**
_Building essential, high-performance tools for the modern web._
