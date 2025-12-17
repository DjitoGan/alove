// Correction rapide du catalog.service.ts
// Remplacer la section de recherche textuelle pour utiliser uniquement les champs disponibles

const oldSearch = `    // [4a] FULL-TEXT SEARCH
    //      Search in part title, description, model
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { model: { contains: query.q, mode: 'insensitive' } },
      ];
    }`;

const newSearch = `    // [4a] FULL-TEXT SEARCH
    //      Search in part title (description, model non disponibles pour l'instant)
    if (query.q) {
      where.title = { contains: query.q, mode: 'insensitive' };
    }`;

console.log("Remplacer:", oldSearch);
console.log("Par:", newSearch);
