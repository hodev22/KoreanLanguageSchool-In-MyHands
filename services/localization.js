export let translations = {}; // Define a global variable to store translations and export it
export let currentLang = "ko"; // Define the default language as Korean ('ko') and export it

export async function loadTranslations() {  // Function to load translation data asynchronously
  try {
    const response = await fetch('/locales/translation.json'); // Fetch the translation JSON file from the locales folder
    translations = await response.json(); // Assign the fetched data to the translations object
    const savedLang = localStorage.getItem("preferredLang") || currentLang;  // Retrieve the preferred language from localStorage or use the default
    setLanguage(savedLang); // Apply the saved or default language
  } catch (error) {
    console.error("Translation file load failed:", error);
  }
}

export function setLanguage(lang) {  // Function to change the language dynamically
  if (translations[lang]) {  // Check if the language exists in translations
    currentLang = lang; // Update the global language variable
    localStorage.setItem("preferredLang", lang); // Save preference in localStorage
    updateText(); // Update the text content on the page
  } else {
    console.warn(`Language '${lang}' not found in translations.`);
  }
}

// Function to update all elements containing translation keys
export function updateText() {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
     // Get the translation key from the data attribute
     const key = element.getAttribute('data-i18n');
     // Check if the translation exists for the selected language
     if (translations[currentLang][key]) { 
       element.textContent = translations[currentLang][key]; // Update text
     } else {
       console.warn(`Translation for key '${key}' not found.`);
     }
   });
 }
 // Add event listeners to all language switch buttons
 // Buttons must have the class "translate-btn" and a data attribute "data-lang"
 document.querySelectorAll(".translate-btn").forEach((button) => {
   button.addEventListener("click", () => {
     const lang = button.dataset.lang; // Get the language from data attribute
     setLanguage(lang); // Change the language
   });
 });
 // Load translations when the page is fully loaded
 document.addEventListener("DOMContentLoaded", async () => {
   await loadTranslations();
 });
 