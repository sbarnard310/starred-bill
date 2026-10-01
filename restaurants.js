// The Starred Bill: restaurant data.
// Edit this file to add, change or remove restaurants. One line per restaurant.
//   id      a unique number (never reuse one)
//   name    restaurant name
//   area    London neighbourhood
//   stars   Michelin stars: 1, 2 or 3
//   cat     category; a new category name creates a new filter button
//   lunch   set lunch price per person in £, or null if there isn't one
//   dinner  tasting menu (or typical dinner) price per person in £
// Keep the comma at the end of every line. Prices below are sample figures.

window.RESTAURANTS = [
  { id: 1,  name: "Restaurant Gordon Ramsay", area: "Chelsea", stars: 3, cat: "French", lunch: 175, dinner: 295 },
  { id: 2,  name: "Core by Clare Smyth", area: "Notting Hill", stars: 3, cat: "Modern British", lunch: 195, dinner: 265 },
  { id: 3,  name: "Alain Ducasse at The Dorchester", area: "Mayfair", stars: 3, cat: "French", lunch: 145, dinner: 250 },
  { id: 4,  name: "Hélène Darroze at The Connaught", area: "Mayfair", stars: 3, cat: "French", lunch: 165, dinner: 285 },
  { id: 5,  name: "The Ledbury", area: "Notting Hill", stars: 3, cat: "Modern British", lunch: null, dinner: 240 },
  { id: 6,  name: "Claude Bosi at Bibendum", area: "Chelsea", stars: 2, cat: "French", lunch: 105, dinner: 225 },
  { id: 7,  name: "Kitchen Table", area: "Fitzrovia", stars: 2, cat: "Modern British", lunch: null, dinner: 295 },
  { id: 8,  name: "Da Terra", area: "Bethnal Green", stars: 2, cat: "Modern European", lunch: 120, dinner: 185 },
  { id: 9,  name: "Gymkhana", area: "Mayfair", stars: 2, cat: "Indian", lunch: 75, dinner: 140 },
  { id: 10, name: "Humble Chicken", area: "Soho", stars: 2, cat: "Japanese", lunch: null, dinner: 220 },
  { id: 11, name: "Ikoyi", area: "Strand", stars: 2, cat: "Creative", lunch: null, dinner: 250 },
  { id: 12, name: "Restaurant Story", area: "Bermondsey", stars: 2, cat: "Modern British", lunch: null, dinner: 250 },
  { id: 13, name: "Trishna", area: "Marylebone", stars: 1, cat: "Indian", lunch: 55, dinner: 95 },
  { id: 14, name: "Bibi", area: "Mayfair", stars: 1, cat: "Indian", lunch: null, dinner: 120 },
  { id: 15, name: "Brat", area: "Shoreditch", stars: 1, cat: "Grill", lunch: null, dinner: 75 },
  { id: 16, name: "Kol", area: "Marylebone", stars: 1, cat: "Mexican", lunch: 85, dinner: 150 },
  { id: 17, name: "Sabor", area: "Mayfair", stars: 1, cat: "Spanish", lunch: null, dinner: 65 },
  { id: 18, name: "Endo at the Rotunda", area: "White City", stars: 1, cat: "Japanese", lunch: null, dinner: 250 },
  { id: 19, name: "Dinings SW3", area: "Chelsea", stars: 1, cat: "Japanese", lunch: 65, dinner: 160 },
  { id: 20, name: "Hakkasan Hanway Place", area: "Fitzrovia", stars: 1, cat: "Chinese", lunch: 58, dinner: 128 },
  { id: 21, name: "Lyle's", area: "Shoreditch", stars: 1, cat: "Modern British", lunch: 65, dinner: 110 },
  { id: 22, name: "St. Barts", area: "Smithfield", stars: 1, cat: "Modern British", lunch: null, dinner: 175 },
  { id: 23, name: "Pied à Terre", area: "Fitzrovia", stars: 1, cat: "French", lunch: 55, dinner: 135 },
  { id: 24, name: "Hide", area: "Mayfair", stars: 1, cat: "Modern British", lunch: 75, dinner: 175 },
];
