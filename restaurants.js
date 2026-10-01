// The Starred Bill: restaurant data (from the January 2025 price sheet).
// Edit this file to add, change or remove restaurants. One line per restaurant.
//   id          a unique number (never reuse one)
//   name        restaurant name
//   area        London neighbourhood, also used for the Google Maps link
//   stars       Michelin stars: 1, 2 or 3
//   cat         cuisine; a new name creates a new filter button
//   rating      Google reviews rating, or null
//   dinner      dinner price per person in £, or null if unknown
//   dinnerType  "menu" (tasting or set menu) or "main" (average à la carte main course)
//   dinnerNote  what the dinner price covers
//   wine        cheapest wine pairing in £, or null
//   lunch       lunch set menu in £, or null if there isn't one
//   lunchNote   what the lunch price covers
//   weekend     weekend lunch: "Sat", "Sat & Sun", "Weekdays only", or null
// Prices exclude service. Keep the comma at the end of every line.

window.RESTAURANTS = [
  {id: 1, name: "1890 by Gordon Ramsay", area: "Strand", stars: 1, cat: "French Contemporary", rating: 4.5, dinner: 175, dinnerType: "menu", dinnerNote: "Tasting menu", wine: null, lunch: 90, lunchNote: "5 courses, no choice", weekend: "Sat"},
  {id: 2, name: "A. Wong", area: "Victoria", stars: 2, cat: "Chinese", rating: 4.3, dinner: 220, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 125, lunch: 195, lunchNote: "Tasting menu", weekend: "Sat"},
  {id: 3, name: "Akoko", area: "Fitzrovia", stars: 1, cat: "African", rating: 4.8, dinner: 120, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 95, lunch: 55, lunchNote: "5 courses, no choice", weekend: "Sat"},
  {id: 4, name: "Alain Ducasse at the Dorchester", area: "Mayfair", stars: 3, cat: "French", rating: 4.3, dinner: 285, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 145, lunch: null, lunchNote: "", weekend: null},
  {id: 5, name: "Alex Dilling at Hotel Café Royal", area: "Piccadilly", stars: 2, cat: "Modern French", rating: 4.1, dinner: 215, dinnerType: "menu", dinnerNote: "Tasting menu", wine: null, lunch: null, lunchNote: "", weekend: null},
  {id: 6, name: "Amaya", area: "Belgravia", stars: 1, cat: "Indian", rating: 4.3, dinner: 75, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 47, lunch: 32, lunchNote: "Large platter", weekend: "Sat & Sun"},
  {id: 7, name: "Angler", area: "Moorgate", stars: 1, cat: "Seafood", rating: 4.6, dinner: 155, dinnerType: "menu", dinnerNote: "Tasting menu", wine: null, lunch: null, lunchNote: "", weekend: null},
  {id: 8, name: "Aulis", area: "Soho", stars: 1, cat: "Creative British", rating: 4.8, dinner: 185, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 95, lunch: null, lunchNote: "", weekend: null},
  {id: 9, name: "Behind", area: "London Fields", stars: 1, cat: "Modern British", rating: 4.8, dinner: 118, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 88, lunch: 64, lunchNote: "Tasting menu", weekend: "Weekdays only"},
  {id: 10, name: "Benares", area: "Mayfair", stars: 1, cat: "Indian", rating: 4.3, dinner: 139, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 104, lunch: 49, lunchNote: "3 (£43) or 4 courses, choice of 5", weekend: null},
  {id: 11, name: "Brat", area: "Shoreditch", stars: 1, cat: "Traditional British", rating: 4.5, dinner: 45, dinnerType: "main", dinnerNote: "À la carte", wine: null, lunch: null, lunchNote: "", weekend: null},
  {id: 12, name: "Brooklands by Claude Bosi", area: "Belgravia", stars: 2, cat: "Modern Cuisine", rating: 4.3, dinner: 205, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 145, lunch: 65, lunchNote: "3 courses, choice of 2", weekend: "Sat"},
  {id: 13, name: "Casa Fofo", area: "Clapton", stars: 1, cat: "Modern Cuisine", rating: 4.7, dinner: 73, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 54, lunch: null, lunchNote: "", weekend: null},
  {id: 14, name: "Chez Bruce", area: "Wandsworth", stars: 1, cat: "French", rating: 4.8, dinner: 95, dinnerType: "menu", dinnerNote: "3 courses, choice of 5", wine: null, lunch: 95, lunchNote: "3 courses, choice of 5", weekend: "Sat & Sun"},
  {id: 15, name: "Chishuru", area: "Fitzrovia", stars: 1, cat: "African", rating: 4.6, dinner: 95, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 68, lunch: 45, lunchNote: "3 courses, choice of 3", weekend: "Weekdays only"},
  {id: 16, name: "City Social", area: "City of London", stars: 1, cat: "Modern Cuisine", rating: 4.4, dinner: 145, dinnerType: "menu", dinnerNote: "5 courses", wine: null, lunch: null, lunchNote: "", weekend: null},
  {id: 17, name: "Claude Bosi at the Bibendum", area: "Chelsea", stars: 2, cat: "French", rating: 4.3, dinner: 225, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 180, lunch: 85, lunchNote: "No info on courses", weekend: "Sat & Sun"},
  {id: 18, name: "Club Gascon", area: "Smithfield", stars: 1, cat: "French", rating: 4.4, dinner: 150, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 110, lunch: 65, lunchNote: "3 courses, choice of 2", weekend: "Weekdays only"},
  {id: 19, name: "CORE by Clare Smyth", area: "Notting Hill", stars: 3, cat: "Modern British", rating: 4.7, dinner: 265, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 165, lunch: null, lunchNote: "", weekend: null},
  {id: 20, name: "Cycene", area: "Shoreditch", stars: 1, cat: "Modern Cuisine", rating: 4.8, dinner: 175, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 125, lunch: 135, lunchNote: "5 courses, no further info", weekend: "Sat"},
  {id: 21, name: "Da Terra", area: "Bethnal Green", stars: 2, cat: "Creative", rating: 4.8, dinner: 245, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 150, lunch: 180, lunchNote: "Tasting menu", weekend: "Sat"},
  {id: 22, name: "Dining Room at the Goring", area: "Belgravia", stars: 1, cat: "Traditional British", rating: 4.5, dinner: 50, dinnerType: "main", dinnerNote: "À la carte", wine: null, lunch: null, lunchNote: "", weekend: null},
  {id: 23, name: "Dinner by Heston Blumenthal", area: "Knightsbridge", stars: 2, cat: "Traditional British", rating: 4.6, dinner: 160, dinnerType: "menu", dinnerNote: "Dated courses", wine: null, lunch: 65, lunchNote: "3 courses, choice of 2", weekend: "Sat & Sun"},
  {id: 24, name: "Dorian", area: "Notting Hill", stars: 1, cat: "Modern British", rating: 3.9, dinner: 50, dinnerType: "main", dinnerNote: "À la carte", wine: null, lunch: null, lunchNote: "", weekend: null},
  {id: 25, name: "Dysart Petersham", area: "Richmond", stars: 1, cat: "Modern British", rating: 4.7, dinner: 155, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 70, lunch: 85, lunchNote: "3 (£75) or 4 courses, choice of 3", weekend: "Sat"},
  {id: 26, name: "Elystan Street", area: "Chelsea", stars: 1, cat: "Modern British", rating: 4.7, dinner: 125, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 80, lunch: 45, lunchNote: "3 courses, choice of 2 - or choice of 5 for Sunday roast menu (£60 for 3 courses)", weekend: "Sat"},
  {id: 27, name: "Endo at the Rotunda", area: "White City", stars: 1, cat: "Japanese", rating: 4.9, dinner: 275, dinnerType: "menu", dinnerNote: "18 courses, with wine", wine: null, lunch: null, lunchNote: "", weekend: null},
  {id: 28, name: "Evelyn's Table", area: "Soho", stars: 1, cat: "Modern Cuisine", rating: 4.8, dinner: 135, dinnerType: "menu", dinnerNote: "5 courses", wine: 100, lunch: 95, lunchNote: "4 courses, no choice", weekend: "Sat"},
  {id: 29, name: "Five Fields", area: "Chelsea", stars: 1, cat: "Modern Cuisine", rating: 4.7, dinner: 170, dinnerType: "menu", dinnerNote: "Tasting menu", wine: null, lunch: 95, lunchNote: "6 courses, no choice", weekend: "Sat"},
  {id: 30, name: "Frog by Adam Handling", area: "Covent Garden", stars: 1, cat: "Modern Cuisine", rating: 4.7, dinner: 195, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 150, lunch: 100, lunchNote: "4 courses, no choice", weekend: "Sat"},
  {id: 31, name: "Galvin La Chapelle", area: "Spitalfields", stars: 1, cat: "French", rating: 4.6, dinner: 145, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 90, lunch: 55, lunchNote: "3 courses, choice of 4", weekend: "Sat & Sun"},
  {id: 32, name: "Gymkhana", area: "Mayfair", stars: 2, cat: "Indian", rating: 4.5, dinner: 140, dinnerType: "menu", dinnerNote: "Tasting menu, choice of 3", wine: 105, lunch: 60, lunchNote: "4 courses, choice of 5", weekend: "Sat & Sun"},
  {id: 33, name: "Harwood Arms", area: "Fulham", stars: 1, cat: "Modern British", rating: 4.6, dinner: 79, dinnerType: "menu", dinnerNote: "2 (£64) or 3 courses, choice of 4", wine: null, lunch: 79, lunchNote: "2 (£64) or 3 courses, choice of 4", weekend: "Sat & Sun"},
  {id: 34, name: "Helene Darroze at the Connaught", area: "Mayfair", stars: 3, cat: "Modern Cuisine", rating: 4.5, dinner: 225, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 145, lunch: 125, lunchNote: "3 courses, choice of 3", weekend: "Weekdays only"},
  {id: 35, name: "HIDE", area: "Mayfair", stars: 1, cat: "Modern British", rating: 4.5, dinner: 160, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 115, lunch: 56, lunchNote: "3 courses, choice of 3", weekend: "Sat & Sun"},
  {id: 36, name: "Humble Chicken", area: "Soho", stars: 1, cat: "Japanese", rating: 4.7, dinner: 185, dinnerType: "menu", dinnerNote: "16 courses", wine: 95, lunch: 135, lunchNote: "12 course tasting menu", weekend: "Sat"},
  {id: 37, name: "Humo", area: "Mayfair", stars: 1, cat: "Grills", rating: 4.7, dinner: 155, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 110, lunch: 66, lunchNote: "3 (£55) or 4 courses, no choice", weekend: "Sat"},
  {id: 38, name: "Ikoyi", area: "Strand", stars: 2, cat: "Creative", rating: 4.5, dinner: 350, dinnerType: "menu", dinnerNote: "Tasting menu, with wine?", wine: null, lunch: 200, lunchNote: "Shorter tasting menu", weekend: null},
  {id: 39, name: "Jamavar", area: "Mayfair", stars: 1, cat: "Indian", rating: 4.2, dinner: 125, dinnerType: "menu", dinnerNote: "Tasting menu, choice of 2", wine: 95, lunch: 57, lunchNote: "3 (£51) or 4 courses, choice of 4", weekend: "Sat & Sun"},
  {id: 40, name: "Kai", area: "Mayfair", stars: 1, cat: "Chinese", rating: 4.4, dinner: 45, dinnerType: "main", dinnerNote: "À la carte", wine: null, lunch: null, lunchNote: "", weekend: null},
  {id: 41, name: "Kitchen Table", area: "Fitzrovia", stars: 2, cat: "Modern Cuisine", rating: 4.7, dinner: 265, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 160, lunch: null, lunchNote: "", weekend: null},
  {id: 42, name: "Kitchen W8", area: "Kensington", stars: 1, cat: "Modern Cuisine", rating: 4.5, dinner: 110, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 60, lunch: 50, lunchNote: "3 courses, choice of 2 - or choice of 4 for Sunday roast menu (£50 for 3 courses)", weekend: "Sat & Sun"},
  {id: 43, name: "KOL", area: "Marylebone", stars: 1, cat: "Mexican", rating: 4.4, dinner: 185, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 120, lunch: 145, lunchNote: "Tasting menu", weekend: "Weekdays only"},
  {id: 44, name: "La Dame de Pic London", area: "Tower Hill", stars: 2, cat: "Modern French", rating: 4.6, dinner: 165, dinnerType: "menu", dinnerNote: "Tasting menu, choice of 2", wine: 130, lunch: 65, lunchNote: "2 (£55) or 3 courses, choice of 3", weekend: "Weekdays only"},
  {id: 45, name: "La Trompette", area: "Chiswick", stars: 1, cat: "Modern British", rating: 4.7, dinner: 90, dinnerType: "menu", dinnerNote: "3 courses, choice of 6", wine: null, lunch: 45, lunchNote: "3 courses, choice of 2 - or choice of 6 for £65", weekend: "Sat & Sun"},
  {id: 46, name: "Luca", area: "Clerkenwell", stars: 1, cat: "Italian", rating: 4.5, dinner: 110, dinnerType: "menu", dinnerNote: "4 courses, no choice", wine: 75, lunch: 38, lunchNote: "2 (£32) or 3 courses, choice of 3, or £95 for the tasting menu", weekend: "Sat"},
  {id: 47, name: "Lyle's", area: "Shoreditch", stars: 1, cat: "Modern British", rating: 4.5, dinner: 119, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 65, lunch: null, lunchNote: "", weekend: null},
  {id: 48, name: "Mountain", area: "Soho", stars: 1, cat: "Spanish", rating: 4.4, dinner: 50, dinnerType: "main", dinnerNote: "À la carte", wine: null, lunch: null, lunchNote: "", weekend: null},
  {id: 49, name: "Murano", area: "Mayfair", stars: 1, cat: "Italian", rating: 4.6, dinner: 155, dinnerType: "menu", dinnerNote: "3 (£95) to 6 courses, choice of 3", wine: null, lunch: 60, lunchNote: "2 (£55) or 3 courses, choice of 3", weekend: "Sat"},
  {id: 50, name: "Muse by Tom Aikens", area: "Belgravia", stars: 1, cat: "Creative", rating: 4.8, dinner: 180, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 90, lunch: 95, lunchNote: "7 or 10 (£180) course tasting menu", weekend: "Sat"},
  {id: 51, name: "Ormer Mayfair", area: "Mayfair", stars: 1, cat: "Modern British", rating: 4.7, dinner: 122, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 122, lunch: null, lunchNote: "", weekend: null},
  {id: 52, name: "Pavyllon London", area: "Mayfair", stars: 1, cat: "French Contemporary", rating: 4.7, dinner: 110, dinnerType: "menu", dinnerNote: "Tasting menu", wine: null, lunch: 56, lunchNote: "4 courses, no choice", weekend: "Sat & Sun"},
  {id: 53, name: "Petrus by Gordon Ramsay", area: "Belgravia", stars: 1, cat: "French", rating: 4.6, dinner: 150, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 150, lunch: 55, lunchNote: "4 courses, no choice", weekend: "Weekdays only"},
  {id: 54, name: "Pied a Terre", area: "Fitzrovia", stars: 1, cat: "Creative", rating: 4.4, dinner: 155, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 100, lunch: 55, lunchNote: "4 courses, choice of 2 - or 4-10 course tasting menu (£80-£155)", weekend: "Sat"},
  {id: 55, name: "Portland", area: "Fitzrovia", stars: 1, cat: "Modern Cuisine", rating: 4.6, dinner: 110, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 85, lunch: 59, lunchNote: "2 (£49) or 3 courses, choice of 5", weekend: "Sat"},
  {id: 56, name: "Quilon", area: "Westminster", stars: 1, cat: "Indian", rating: 4.4, dinner: null, dinnerType: "menu", dinnerNote: "Tasting menu, choice of 2 - paired with beers", wine: null, lunch: 42, lunchNote: "3 courses, choice of 4", weekend: "Weekdays only"},
  {id: 57, name: "Restaurant Gordon Ramsay", area: "Chelsea", stars: 3, cat: "French", rating: 4.4, dinner: 180, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 200, lunch: null, lunchNote: "", weekend: null},
  {id: 58, name: "River Café", area: "Hammersmith", stars: 1, cat: "Italian", rating: 4.3, dinner: 55, dinnerType: "main", dinnerNote: "À la carte", wine: null, lunch: 80, lunchNote: "3 (£65) or 4 courses, choice of 4", weekend: "Sat & Sun"},
  {id: 59, name: "Sabor", area: "Mayfair", stars: 1, cat: "Spanish", rating: 4.6, dinner: 30, dinnerType: "main", dinnerNote: "À la carte", wine: null, lunch: null, lunchNote: "", weekend: null},
  {id: 60, name: "Sketch, The Lecture Room and Library", area: "Mayfair", stars: 3, cat: "Modern French", rating: 4.3, dinner: 225, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 165, lunch: 150, lunchNote: "4 courses, choice of 3", weekend: "Sat"},
  {id: 61, name: "SOLA", area: "Soho", stars: 1, cat: "Californian", rating: 4.6, dinner: 159, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 125, lunch: 74, lunchNote: "4 courses, choice of 2", weekend: "Sat"},
  {id: 62, name: "Sollip", area: "London Bridge", stars: 1, cat: "Creative", rating: 4.6, dinner: 135, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 87, lunch: 78, lunchNote: "5 courses, no choice", weekend: "Sat"},
  {id: 63, name: "St. Barts", area: "Smithfield", stars: 1, cat: "Modern British", rating: 4.6, dinner: 160, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 115, lunch: 110, lunchNote: "4 courses, no choice", weekend: "Sat"},
  {id: 64, name: "St. JOHN", area: "Smithfield", stars: 1, cat: "Traditional British", rating: 4.5, dinner: 40, dinnerType: "main", dinnerNote: "À la carte", wine: null, lunch: null, lunchNote: "", weekend: null},
  {id: 65, name: "Story", area: "Bermondsey", stars: 2, cat: "Modern Cuisine", rating: 4.6, dinner: 250, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 125, lunch: null, lunchNote: "", weekend: null},
  {id: 66, name: "Sushi Kanesaka", area: "Mayfair", stars: 1, cat: "Japanese", rating: 4.5, dinner: 420, dinnerType: "menu", dinnerNote: "17 courses", wine: null, lunch: null, lunchNote: "", weekend: null},
  {id: 67, name: "Taku", area: "Mayfair", stars: 1, cat: "Japanese", rating: 4.4, dinner: 300, dinnerType: "menu", dinnerNote: "20 courses", wine: 320, lunch: 160, lunchNote: "17 courses", weekend: "Sat"},
  {id: 68, name: "The Clove Club", area: "Shoreditch", stars: 2, cat: "Creative", rating: 4.6, dinner: 225, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 175, lunch: 95, lunchNote: "3 courses, choice of 2", weekend: "Sat"},
  {id: 69, name: "The Ledbury", area: "Notting Hill", stars: 3, cat: "Modern Cuisine", rating: 4.7, dinner: 275, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 150, lunch: 200, lunchNote: "6 courses, or 8 for £250", weekend: "Sat"},
  {id: 70, name: "The Ninth", area: "Fitzrovia", stars: 1, cat: "Mediterranean Cuisine", rating: 4.5, dinner: 97, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 70, lunch: 38, lunchNote: "2 (£33) or 3 courses, choice of 3", weekend: "Sat"},
  {id: 71, name: "The Ritz Restaurant", area: "St James's", stars: 1, cat: "Modern British", rating: 4.6, dinner: 215, dinnerType: "menu", dinnerNote: "Tasting menu", wine: 131, lunch: 89, lunchNote: "3 courses, choice of 3", weekend: "Weekdays only"},
  {id: 72, name: "Trinity", area: "Clapham", stars: 1, cat: "Modern Cuisine", rating: 4.7, dinner: 140, dinnerType: "menu", dinnerNote: "4 courses, choice of 4", wine: null, lunch: 90, lunchNote: "4 courses, choice of 4", weekend: "Sat"},
  {id: 73, name: "Trishna", area: "Marylebone", stars: 1, cat: "Indian", rating: 4.5, dinner: 110, dinnerType: "menu", dinnerNote: "5 courses, choice of 2", wine: 85, lunch: 55, lunchNote: "3 (£50) or 4 courses, choice of 3", weekend: "Sat & Sun"},
  {id: 74, name: "Trivet", area: "Bermondsey", stars: 2, cat: "Modern Cuisine", rating: 4.5, dinner: 60, dinnerType: "main", dinnerNote: "À la carte", wine: null, lunch: null, lunchNote: "", weekend: null},
  {id: 75, name: "Umu", area: "Mayfair", stars: 1, cat: "Japanese", rating: 4.2, dinner: 120, dinnerType: "menu", dinnerNote: "Tasting menu, with wine", wine: null, lunch: null, lunchNote: "", weekend: null},
  {id: 76, name: "Veeraswamy", area: "Piccadilly", stars: 1, cat: "Indian", rating: 4.3, dinner: 90, dinnerType: "menu", dinnerNote: "4 courses, no choice", wine: 60, lunch: 48, lunchNote: "2 (£42) or 3 courses, choice of 10", weekend: "Sat & Sun"},
  {id: 77, name: "Wild Honey St. James", area: "St James's", stars: 1, cat: "Modern British", rating: 4.5, dinner: 95, dinnerType: "menu", dinnerNote: "3 courses, choice of 4", wine: null, lunch: 45, lunchNote: "3 courses, choice of 2", weekend: "Weekdays only"},
];
