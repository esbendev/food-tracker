Act as an expert front-end developer. Build a mobile web application split into three separate physical files: `index.html` (Home/Calendar), `add-item.html` (Add Food), and `add-symptom.html` (Add Symptom).

### Tech Stack & Architecture Constraints
1. Multi-Page Architecture: Provide the full code for three separate HTML files. Include vanilla CSS in `<style>` tags and vanilla JavaScript in `<script>` tags inside each respective file.
2. Web Storage API: Use `localStorage` to persist all data. Data saved in the add screens must immediately reflect on the home screen.
3. Mobile-First: Optimize strictly for mobile screens (max-width: 480px). Ignore desktop layouts. Use touch-friendly target sizes (minimum 44px).
4. No Frameworks: Do not use React, Tailwind, or external libraries. Use standard CSS and semantic HTML.

### Data Structure & State Transfer
- Food Record: { date: "YYYY-MM-DD", meal: "d"|"s"|"a"|"m"|"c", items: ["string"] }
- Symptom Record: { date: "YYYY-MM-DD", meal: "d"|"s"|"a"|"m"|"c", symptoms: ["string"] }
- Global History Lists (Saved in localStorage):
  * `global_food_history`: Array of unique strings representing previously saved food items.
  * `global_symptom_history`: Array of unique strings representing previously saved symptoms.

*State Sharing:* When navigating from `index.html` to either add screen, pass the currently selected calendar date via URL query parameters (e.g., `add-item.html?date=2026-05-31`). The add screens must read this parameter to save data to the correct date.

### File 1: `index.html` (Home & Calendar)
- Header: Two navigation links/buttons: "+ New Food" and "+ New Symptom". They must link to their respective files, passing the active calendar date in the URL.
- Calendar Component: 
  * Displays the current month in a grid layout.
  * Navigational buttons to go to previous/next months.
  * Visual Indicators: Small color markers on days (Dot A for food items, Dot B for symptoms, both if both exist).
  * Interactivity: Tapping a day selects it (highlights it) and updates the timeline list below.
- Daily Timeline List: 
  * Scrolling area filling the rest of the vertical screen space.
  * Chronologically merges food and symptoms based on meal order: d -> s -> a -> m -> c.
  * A symptom logged for "a" must appear directly after food logged for "a", but before food/symptoms logged for "m".

### File 2: `add-item.html` & File 3: `add-symptom.html`
(Provide separate clean implementations for both files matching this behavior):
- Header: A back button/link that returns to `index.html`.
- Meal Picker: Horizontal radio-button group or styled button group for (d, s, a, m, c). Only one option can be selected.
- Dynamic Inputs with Custom Fuzzy Matching Suggestions:
  * Starts with one text input field wrapped in a container.
  * As the user types, a custom dropdown container appears directly below that input field.
  * Implement a simple vanilla JS fuzzy matching function (or a case-insensitive `.includes()` lookup if fuzzy is too complex for basic JS) against the `global_food_history` or `global_symptom_history` array.
  * Display a maximum of 5 suggestions in this list. 
  * Design suggestions as cute, easy-to-tap pill buttons. Tapping a suggestion fills the input with that text and hides the list.
  * A "+ Add Another" button dynamically appends a new text input field. Each new field must independently handle its own input listeners and suggestion dropdown list.
- Confirm Button: 
  * Reads the date from the URL parameter.
  * Appends the new inputs to that date's array in `localStorage`.
  * History Update: Read all non-empty input strings, trim whitespace, and add them to their respective global history array (`global_food_history` or `global_symptom_history`) ensuring no duplicate entries are saved.
  * Crucial: Sanitize inputs; completely ignore empty fields. Do not save empty strings.
  * Automatically redirects back to `index.html` after saving.

### UX, Styling & Aesthetic Guidelines
- Theme: Cute, soft, modern purple aesthetic (Kawaii/Pastel inspired).
- Color Palette CSS Variables: 
  * Background: Very soft pastel lavender/off-white (e.g., #F8F7FC)
  * Primary Accent: Soft lilac/purple (e.g., #9D8DF1)
  * Secondary/Buttons: Sweet lavender (e.g., #B8A9F9)
  * Food Markers: Soft pastel violet (e.g., #A384FF)
  * Symptom Markers: Pastel orchid/pink-purple (e.g., #E2A0FF)
  * Text: Dark plum/charcoal for high readability (e.g., #3A3052)
- Card Elements: Use rounded corners (e.g., border-radius: 16px or 20px) and subtle soft shadows to make the UI look cute and bubbly.
- Smooth scrolling for the timeline list.
