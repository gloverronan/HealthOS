# HealthOS

A modern, feature-based React application for tracking health and fitness.

## Project Structure

This project has been refactored from a single `index.html` file to a modern Vite + React architecture.

```
src/
├── features/           # Feature-specific components
│   ├── activity/       # Activity hub
│   ├── auth/           # Authentication
│   ├── cardio/         # Cardio tracking
│   ├── food/           # Food logging & AI
│   ├── gym/            # Workout tracking
│   ├── settings/       # App settings
│   └── summary/        # Daily summary
├── components/         # Shared components
│   ├── ui/             # UI elements (Icons, Calendar, Rings)
│   └── layout/         # Layout components (Menu)
├── services/           # External services (Firebase)
├── utils/              # Helper functions
├── App.jsx             # Main application component
├── main.jsx            # Entry point
└── index.css           # Global styles (Tailwind)
```

## Getting Started

1.  **Install Node.js**: Ensure you have Node.js installed.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
4.  **Build for Production**:
    ```bash
    npm run build
    ```

## Configuration

-   **Firebase**: Configuration is located in `src/services/firebase.js`.
-   **Tailwind**: Configuration is in `tailwind.config.js`.

## Notes

-   The original `index.html` has been backed up to `src/legacy_index.html`.
-   Ensure your Firebase security rules allow access to the collections used (`users`, `app_config`).
