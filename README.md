# FaceAcne: Facial Acne Detection and Analysis 

## 📖 Overview
FaceAcne is a computer vision and machine learning project designed to automatically detect, localize, and classify acne lesions from facial images. This tool aims to provide an accessible way to analyze skin conditions, track acne progression over time, and offer standardized evaluations for dermatological research or personal skincare tracking.

## ✨ Features
* **Acne Detection & Localization:** Identifies the exact coordinates of acne lesions on the face using bounding boxes.
* **Severity Classification:** Categorizes acne into different severity levels (e.g., mild, moderate, severe, cystic).
* **Skin Tone Agnostic:** Trained on a diverse dataset to ensure reliable performance across various skin tones and lighting conditions.
* **REST API:** Includes a Flask/FastAPI backend for easy integration with web or mobile applications.
* **Real-time Inference:** Optimized for fast inference on both CPU and GPU environments.

## 🛠️ Tech Stack
* **Language:** Python 3.9+
* **Machine Learning:** PyTorch / TensorFlow 
* **Computer Vision:** OpenCV, PIL
* **Data Manipulation:** NumPy, Pandas
* **API Framework:** FastAPI / Flask
* **Deployment:** Docker

## 📂 Project Structure
```text
FaceAcne/
├── data/                  # Raw and processed datasets
├── models/                # Saved weights and model architecture files
├── notebooks/             # Jupyter notebooks for EDA and model experiments
├── src/                   # Source code for the project
│   ├── config.py          # Configuration and hyperparameters
│   ├── data_loader.py     # Data augmentation and loading pipelines
│   ├── model.py           # Neural network definitions
│   ├── train.py           # Training loop and validation scripts
│   └── inference.py       # Script for running predictions on new images
├── api/                   # API routing and server setup
├── requirements.txt       # Python dependencies
├── Dockerfile             # Containerization setup
└── README.md              # Project documentation
