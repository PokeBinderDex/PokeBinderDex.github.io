// Pokemon Scanner - PokeBinderDex
// Version with multi-image processing and image source tracking in PDF

import { POKEDEX, POKEMON_DATA, GENERATIONS, LEGENDARY_POKEMON, STARTER_POKEMON } from './pokedex.js';

// Variables globales
let gradioClient = null;
let imageQueue = [];
let isProcessing = false;
let processedResults = [];
let processingErrors = [];

const MAX_IMAGES = 50;

// Parse Pokemon data
function parsePokemonData() {
    const lines = POKEMON_DATA.trim().split('\n');
    const pokemonMap = new Map();
    
    for (let i = 1; i < lines.length; i++) {
        const [number, name, type1, type2] = lines[i].split(',');
        pokemonMap.set(parseInt(number), {
            number: parseInt(number),
            name: name,
            type1: type1,
            type2: type2 || null
        });
    }
    return pokemonMap;
}

// Calculate statistics
function calculateStats(detectedPokemon) {
    const pokemonMap = parsePokemonData();
    const stats = {
        global: { total: 0, percentage: 0 },
        generations: {},
        types: {},
        legendary: { count: 0, percentage: 0 },
        starter: { count: 0, percentage: 0 }
    };

    // Initialize generation stats
    Object.keys(GENERATIONS).forEach(gen => {
        stats.generations[gen] = { count: 0, percentage: 0 };
    });

    // Process each detected Pokemon
    detectedPokemon.forEach(pokemon => {
        const pokedex = POKEDEX[pokemon.language] || POKEDEX['en'];
        const index = pokedex.indexOf(pokemon.name);
        
        if (index !== -1) {
            const pokemonNumber = index + 1;
            const pokemonData = pokemonMap.get(pokemonNumber);
            
            if (pokemonData) {
                // Global stats
                stats.global.total++;
                
                // Generation stats
                Object.entries(GENERATIONS).forEach(([gen, range]) => {
                    if (pokemonNumber >= range.min && pokemonNumber <= range.max) {
                        stats.generations[gen].count++;
                    }
                });
                
                // Type stats
                [pokemonData.type1, pokemonData.type2].forEach(type => {
                    if (type) {
                        if (!stats.types[type]) {
                            stats.types[type] = {
                                count: 0,
                                percentage: 0,
                                generationBreakdown: {}
                            };
                            // Initialize generation breakdown for this type
                            Object.keys(GENERATIONS).forEach(gen => {
                                stats.types[type].generationBreakdown[gen] = 0;
                            });
                        }
                        stats.types[type].count++;
                        
                        // Add to generation breakdown for this type
                        Object.entries(GENERATIONS).forEach(([gen, range]) => {
                            if (pokemonNumber >= range.min && pokemonNumber <= range.max) {
                                stats.types[type].generationBreakdown[gen]++;
                            }
                        });
                    }
                });
                
                // Legendary stats
                if (LEGENDARY_POKEMON.has(pokemonNumber)) {
                    stats.legendary.count++;
                }
                
                // Starter stats
                if (STARTER_POKEMON.has(pokemonNumber)) {
                    stats.starter.count++;
                }
            }
        }
        else {
            console.log(pokemon.name)
        }
    });

    // Calculate percentages
    const totalPokemon = 1025;
    stats.global.percentage = (stats.global.total / totalPokemon) * 100;
    
    Object.keys(stats.generations).forEach(gen => {
        const range = GENERATIONS[gen];
        const genTotal = range.max - range.min + 1;
        stats.generations[gen].percentage = (stats.generations[gen].count / genTotal) * 100;
    });
    
    // Calculate type percentages
    const totalTypeOccurrences = Object.values(stats.types).reduce((sum, type) => sum + type.count, 0);
    Object.keys(stats.types).forEach(type => {
        stats.types[type].percentage = (stats.types[type].count / totalTypeOccurrences) * 100;
    });
    
    stats.legendary.percentage = (stats.legendary.count / LEGENDARY_POKEMON.size) * 100;
    stats.starter.percentage = (stats.starter.count / STARTER_POKEMON.size) * 100;

    return stats;
}

// Language mapping
const LANGUAGE_FLAGS = {
    'en': '🇺🇸',
    'fr': '🇫🇷',
    'it': '🇮🇹',
    'de': '🇩🇪',
    'es': '🇪🇸'
};

const LANGUAGE_NAMES = {
    'en': 'English',
    'fr': 'Français',
    'it': 'Italiano',
    'de': 'Deutsch',
    'es': 'Español'
};

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const imageQueueDiv = document.getElementById('imageQueue');
const imageGrid = document.getElementById('imageGrid');
const queueCount = document.getElementById('queueCount');
const scanButton = document.getElementById('scanButton');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const errorList = document.getElementById('errorList');
const results = document.getElementById('results');
const resultsList = document.getElementById('resultsList');

const languageSelect = document.getElementById('language');

// Initialiser le client Gradio
async function initGradioClient() {
    if (!gradioClient) {
        try {
            const { Client } = await import("https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.js");
            gradioClient = await Client.connect("leonheart2B/pokemon-card-scanner");
            console.log("✅ Client Gradio connecté");
        } catch (error) {
            console.error("❌ Erreur connexion Gradio:", error);
            throw error;
        }
    }
    return gradioClient;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation du scanner Pokémon...');
    try {
        await initGradioClient();
        console.log('✅ Scanner prêt !');
    } catch (error) {
        console.error('❌ Échec d\'initialisation:', error);
        showError('Erreur d\'initialisation. Veuillez recharger la page.');
    }
});

// Drag & drop handling
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    addImagesToQueue(files);
});

// File selection handling
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    addImagesToQueue(files);
});

uploadArea.addEventListener('click', () => {
    fileInput.click();
});

// Ajouter des images à la file d'attente
function addImagesToQueue(files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showError('Aucune image valide sélectionnée.');
        return;
    }

    const totalAfterAdd = imageQueue.length + imageFiles.length;
    if (totalAfterAdd > MAX_IMAGES) {
        const allowedCount = MAX_IMAGES - imageQueue.length;
        if (allowedCount > 0) {
            showError(`Maximum ${MAX_IMAGES} images. Seules les ${allowedCount} premières ont été ajoutées.`);
            imageFiles.splice(allowedCount);
        } else {
            showError(`Maximum ${MAX_IMAGES} images atteint.`);
            return;
        }
    }

    imageFiles.forEach(file => {
        const imageId = Date.now() + Math.random();
        const imageItem = {
            id: imageId,
            file: file,
            status: 'waiting',
            result: null,
            error: null
        };
        
        imageQueue.push(imageItem);
        createImagePreview(imageItem);
    });

    updateQueueDisplay();
    hideError();
    hideResults();
}

// Créer un aperçu d'image
function createImagePreview(imageItem) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = 'image-item';
        div.dataset.imageId = imageItem.id;
        
        div.innerHTML = `
            <img src="${e.target.result}" alt="${imageItem.file.name}">
            <button class="image-remove" onclick="removeImage(${imageItem.id})">×</button>
            <div class="image-status">On hold</div>
        `;
        
        imageGrid.appendChild(div);
    };
    reader.readAsDataURL(imageItem.file);
}

// Supprimer une image
window.removeImage = function(imageId) {
    if (isProcessing) return;
    
    imageQueue = imageQueue.filter(item => item.id !== imageId);
    const element = document.querySelector(`[data-image-id="${imageId}"]`);
    if (element) element.remove();
    
    updateQueueDisplay();
};

// Vider la file d'attente
window.clearQueue = function() {
    if (isProcessing) return;
    
    imageQueue = [];
    imageGrid.innerHTML = '';
    updateQueueDisplay();
    hideResults();
};

// Mettre à jour l'affichage de la file d'attente
function updateQueueDisplay() {
    queueCount.textContent = `${imageQueue.length} image(s) waiting`;
    
    if (imageQueue.length > 0) {
        imageQueueDiv.classList.add('show');
        scanButton.disabled = false;
        scanButton.onclick = processAllImages;
    } else {
        imageQueueDiv.classList.remove('show');
        scanButton.disabled = true;
    }
}

// Handle selected file (pour compatibilité avec l'ancien code)
function handleFileSelect(file) {
    addImagesToQueue([file]);
}

// Traiter toutes les images
async function processAllImages() {
    if (isProcessing || imageQueue.length === 0) return;
    
    isProcessing = true;
    processedResults = [];
    processingErrors = [];
    scanButton.disabled = true;
    
    // Afficher la barre de progression
    progressSection.classList.add('show');
    updateProgress(0, imageQueue.length);
    
    hideError();
    hideResults();
    
    const selectedLang = languageSelect.value;
    console.log(`🌐 Début du traitement de ${imageQueue.length} images en ${selectedLang}`);

    try {
        const client = await initGradioClient();
        
        for (let i = 0; i < imageQueue.length; i++) {
            const imageItem = imageQueue[i];
            
            // Mettre à jour le statut visuel
            updateImageStatus(imageItem.id, 'processing', 'Processing...');
            
            try {
                console.log(`📸 Traitement image ${i + 1}/${imageQueue.length}: ${imageItem.file.name}`);
                
                const result = await client.predict("/process_and_format", {
                    image: imageItem.file,
                    lang: selectedLang,
                    similarity_threshold: 72,
                    size_tolerance: 0.8,
                    return_best_only: false,
                    verbose: false
                });

                const [message, details] = result.data;
                
                if (message.includes('✅')) {
                    imageItem.status = 'completed';
                    imageItem.result = { message, details };
                    imageItem.imageIndex = i + 1; // Stocker l'index de l'image
                    processedResults.push(imageItem);
                    updateImageStatus(imageItem.id, 'completed', 'Completed');
                } else {
                    throw new Error(message);
                }
                
            } catch (err) {
                console.error(`❌ Erreur image ${imageItem.file.name}:`, err);
                imageItem.status = 'error';
                imageItem.error = err.message;
                processingErrors.push({
                    filename: imageItem.file.name,
                    error: err.message
                });
                updateImageStatus(imageItem.id, 'error', 'Erreur');
            }
            
            updateProgress(i + 1, imageQueue.length);
            
            // Petite pause pour éviter de surcharger l'API
            await new Promise(resolve => setTimeout(resolve, 250));
        }
        
        // Compiler tous les Pokémon détectés avec leur source d'image
        const allDetectedPokemon = compileAllDetectedPokemonWithSource(selectedLang);
        
        // Afficher les résultats avec les statistiques et le PDF
        displayResults(allDetectedPokemon, selectedLang);
        
    } catch (err) {
        console.error('❌ Erreur globale:', err);
        showError(`Erreur globale: ${err.message}`);
    } finally {
        isProcessing = false;
        scanButton.disabled = false;
        progressSection.classList.remove('show');
    }
}

// Compiler tous les Pokémon détectés depuis toutes les images avec leur source
function compileAllDetectedPokemonWithSource(language) {
    const allPokemon = [];
    const pokemonSources = new Map(); // Map pour stocker les sources de chaque Pokémon
    
    processedResults.forEach(imageItem => {
        const { details } = imageItem.result;
        const imageNumber = imageItem.imageIndex;
        
        if (details && details.includes('**Détails des détections :**')) {
            const imagePokemon = parseImageResults(details, language);
            
            imagePokemon.forEach(pokemon => {
                const normalizedName = pokemon.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                
                // Si le Pokémon n'a pas encore été ajouté
                if (!pokemonSources.has(normalizedName)) {
                    pokemon.imageSource = imageNumber;
                    pokemonSources.set(normalizedName, imageNumber);
                    allPokemon.push(pokemon);
                }
                // Si le Pokémon existe déjà, on garde la première occurrence mais on peut noter les autres sources
            });
        }
    });
    
    return allPokemon;
}

// Compiler tous les Pokémon détectés depuis toutes les images (version originale pour compatibilité)
function compileAllDetectedPokemon(language) {
    return compileAllDetectedPokemonWithSource(language);
}

// Parser les résultats d'une image
function parseImageResults(details, language) {
    const lines = details.split('\n');
    let currentPokemon = null;
    const pokemonList = [];
    
    lines.forEach(line => {
        line = line.trim();
        
        const pokemonMatch = line.match(/^\*\*\d+\.\s+(.+?)\*\*$/);
        if (pokemonMatch) {
            if (currentPokemon) {
                pokemonList.push(currentPokemon);
            }
            currentPokemon = {
                name: pokemonMatch[1],
                similarity: 0,
                confidence: 0,
                language: language
            };
        }
        
        const simMatch = line.match(/- Similitude\s*:\s*(\d+\.?\d*)%/);
        if (simMatch && currentPokemon) {
            currentPokemon.similarity = parseFloat(simMatch[1]);
        }
        
        const confMatch = line.match(/- Confiance OCR\s*:\s*(\d+\.?\d*)%/);
        if (confMatch && currentPokemon) {
            currentPokemon.confidence = parseFloat(confMatch[1]);
        }

        const langMatch = line.match(/- Langue\s*:\s*(\w+)/);
        if (langMatch && currentPokemon) {
            currentPokemon.language = langMatch[1];
        }
    });
    
    // Ajouter le dernier Pokémon
    if (currentPokemon) {
        pokemonList.push(currentPokemon);
    }
    
    return pokemonList;
}

// Mettre à jour le statut d'une image
function updateImageStatus(imageId, status, statusText) {
    const element = document.querySelector(`[data-image-id="${imageId}"]`);
    if (element) {
        element.className = `image-item ${status}`;
        const statusElement = element.querySelector('.image-status');
        if (statusElement) {
            statusElement.textContent = statusText;
        }
    }
}

// Mettre à jour la barre de progression
function updateProgress(current, total) {
    const percentage = (current / total) * 100;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${current} / ${total} images scanned`;
}

// Scan image (pour compatibilité avec l'ancien code)
async function scanImage(file) {
    addImagesToQueue([file]);
    await processAllImages();
}

// Display results - VERSION ORIGINALE CONSERVÉE
function displayResults(detectedPokemon, language) {
    resultsList.innerHTML = '';
    
    // Add PDF download button at the top
    const pdfButtonContainer = document.createElement('div');
    pdfButtonContainer.className = 'pdf-download-container';
    pdfButtonContainer.innerHTML = `
        <button id="downloadPdfBtn" class="pdf-download-btn">
            📄 Download PDF Checklist
        </button>
    `;
    resultsList.appendChild(pdfButtonContainer);
    
    // Add event listener for PDF download
    document.getElementById('downloadPdfBtn').addEventListener('click', () => {
        generatePDFChecklist(detectedPokemon, language);
    });
    
    // Display detected Pokemon in grouped format
    const detectedCard = document.createElement('div');
    detectedCard.className = 'detected-pokemon';
    
    let pokemonListHTML = '';
    detectedPokemon.forEach(pokemon => {
        const pokedex = POKEDEX[pokemon.language] || POKEDEX['en'];
        let index = -1;
        
        // Recherche insensible à la casse et avec gestion des accents
        for (let i = 0; i < pokedex.length; i++) {
            if (pokedex[i].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 
                pokemon.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")) {
                index = i;
                break;
            }
        }
        
        // Si pas trouvé, essayer une recherche partielle
        if (index === -1) {
            for (let i = 0; i < pokedex.length; i++) {
                if (pokedex[i].toLowerCase().includes(pokemon.name.toLowerCase()) || 
                    pokemon.name.toLowerCase().includes(pokedex[i].toLowerCase())) {
                    index = i;
                    break;
                }
            }
        }
        
        const pokemonNumber = index !== -1 ? index + 1 : null;

        pokemonListHTML += `
            <div class="pokemon-item">
                ${pokemonNumber ? `<img src="assets/pokemon_images/${pokemonNumber.toString().padStart(3, '0')}.png" class="pokemon-image" alt="${pokemon.name}" onerror="this.style.display='none'">` : ''}
                <span class="pokemon-name">${pokemon.name}</span>
                ${pokemonNumber ? `<span class="pokemon-number">#${pokemonNumber.toString().padStart(3, '0')}</span>` : ''}
                ${pokemon.imageSource ? `<span class="pokemon-source">(Img ${pokemon.imageSource})</span>` : ''}
            </div>
        `;
    });
    
    detectedCard.innerHTML = `
        <h4>Detected Pokemon (${detectedPokemon.length})</h4>
        <div class="pokemon-list">
            ${pokemonListHTML}
        </div>
    `;
    resultsList.appendChild(detectedCard);

    // Calculate and display statistics
    const stats = calculateStats(detectedPokemon);
    displayStats(stats);
    
    results.classList.add('show');
    
    // Afficher les erreurs s'il y en a
    if (processingErrors.length > 0) {
        showProcessingErrors();
    }
}

// Afficher les erreurs de traitement
function showProcessingErrors() {
    const errorCard = document.createElement('div');
    errorCard.className = 'stat-card error-card';
    errorCard.innerHTML = `
        <h4>⚠️ Erreurs de traitement (${processingErrors.length})</h4>
        <ul>
            ${processingErrors.map(err => 
                `<li><strong>${err.filename}:</strong> ${err.error}</li>`
            ).join('')}
        </ul>
    `;
    resultsList.appendChild(errorCard);
}

// Dictionnaire des couleurs pour les types Pokémon
const TYPE_COLORS = {
    'Normal': '#A8A878',
    'Fire': '#F08030',
    'Water': '#6890F0',
    'Electric': '#F8D030',
    'Grass': '#78C850',
    'Ice': '#98D8D8',
    'Fighting': '#C03028',
    'Poison': '#A040A0',
    'Ground': '#E0C068',
    'Flying': '#A890F0',
    'Psychic': '#F85888',
    'Bug': '#A8B820',
    'Rock': '#B8A038',
    'Ghost': '#705898',
    'Dragon': '#7038F8',
    'Dark': '#705848',
    'Steel': '#B8B8D0',
    'Fairy': '#EE99AC'
};

// Version plus claire pour les arrière-plans
const TYPE_BACKGROUND_COLORS = {
    'Normal': '#A8A87820',
    'Fire': '#F0803020',
    'Water': '#6890F020',
    'Electric': '#F8D03020',
    'Grass': '#78C85020',
    'Ice': '#98D8D820',
    'Fighting': '#C0302820',
    'Poison': '#A040A020',
    'Ground': '#E0C06820',
    'Flying': '#A890F020',
    'Psychic': '#F8588820',
    'Bug': '#A8B82020',
    'Rock': '#B8A03820',
    'Ghost': '#70589820',
    'Dragon': '#7038F820',
    'Dark': '#70584820',
    'Steel': '#B8B8D020',
    'Fairy': '#EE99AC20'
};

// Fonction modifiée pour displayStats avec fond coloré pour le type favori
function displayStats(stats) {
    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';
    
    // Global statistics with promotion
    const globalCard = document.createElement('div');
    globalCard.className = 'stat-card global-stat';
    
    // Determine encouragement message based on completion percentage
    let promotionMessage = '';
    let promotionIcon = '';
    let promotionClass = '';
    
    if (stats.global.percentage >= 75) {
        promotionMessage = "Amazing collection! You're a true Pokemon Master!";
        promotionIcon = '🏆';
        promotionClass = 'promotion-master';
    } else if (stats.global.percentage >= 50) {
        promotionMessage = "Wow! You're halfway to completing the Pokedex!";
        promotionIcon = '🔥';
        promotionClass = 'promotion-excellent';
    } else if (stats.global.percentage >= 25) {
        promotionMessage = "Great ! Amazing collection !";
        promotionIcon = '⭐';
        promotionClass = 'promotion-good';
    } else if (stats.global.percentage >= 10) {
        promotionMessage = "Nice ! Your collection is growing!";
        promotionIcon = '🚀';
        promotionClass = 'promotion-start';
    } else {
        promotionMessage = "Every collection starts somewhere!";
        promotionIcon = '🌟';
        promotionClass = 'promotion-beginner';
    }
    
    globalCard.innerHTML = `
        <h4>Global Statistics</h4>
        <div class="stat-item">
            <span class="stat-label">Collection Completed</span>
            <div>
                <span class="stat-value">${stats.global.total}/1025 (${stats.global.percentage.toFixed(1)}%)</span>
                <div class="stat-bar">
                    <div class="stat-bar-fill" style="width: ${Math.min(stats.global.percentage, 100)}%"></div>
                </div>
            </div>
        </div>
        <div class="pokebinderdex-promotion ${promotionClass}">
            <div class="promotion-content">
                <span class="promotion-icon">${promotionIcon}</span>
                <span class="promotion-text">${promotionMessage}</span>
            </div>
            <a href="https://pokebinderdx.github.io/#solodex" target="_blank" class="promotion-link">
                Explore SoloDex Collection →
            </a>
        </div>
    `;
    statsContainer.appendChild(globalCard);

    // Generation statistics with targeted promotions
    const genCard = document.createElement('div');
    genCard.className = 'stat-card gen-stat';
    genCard.innerHTML = '<h4>Generation Statistics</h4>';
    
    let hasGenerationData = false;
    let bestGeneration = { name: '', percentage: 0, gen: '' };
    
    Object.entries(stats.generations).forEach(([gen, data]) => {
        const genInfo = GENERATIONS[gen];
        if (data.count > 0) {
            hasGenerationData = true;
            
            // Track best generation
            if (data.percentage > bestGeneration.percentage) {
                bestGeneration = { name: genInfo.name, percentage: data.percentage, gen: gen };
            }
            
            const genTotal = genInfo.max - genInfo.min + 1;
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            
            // Add generation-specific promotion
            let genPromotion = '';
             if (data.percentage >= 80) {
                genPromotion = `
                    <div class="gen-promotion">
                        <span class="gen-promo-text">INCREDIBLE ! You truly are the gen ${gen} expert!</span>
                        <a href="https://pokebinderdx.github.io/#solodex" target="_blank" class="gen-promo-link">
                            You at least deserves to get the best for your ${gen} collection
                        </a>
                    </div>
                `;
            } else if (data.percentage >= 40) {
                genPromotion = `
                    <div class="gen-promotion">
                        <span class="gen-promo-text">🎯 ${gen} specialist!</span>
                        <a href="https://pokebinderdx.github.io/#solodex" target="_blank" class="gen-promo-link">
                            Display your love for ${gen}
                        </a>
                    </div>
                `;
            }
            else if (data.percentage >= 15) {
                genPromotion = `
                    <div class="gen-promotion">
                        <span class="gen-promo-text">📈 Awesome ${gen} collection!</span>
                    </div>
                `;
            }
            
            statItem.innerHTML = `
                <span class="stat-label">${gen} (${genInfo.name})</span>
                <div>
                    <span class="stat-value">${data.count}/${genTotal} (${data.percentage.toFixed(1)}%)</span>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width: ${Math.min(data.percentage, 100)}%"></div>
                    </div>
                    ${genPromotion}
                </div>
            `;
            genCard.appendChild(statItem);
        }
    });
    
    // Add overall generation promotion
    if (hasGenerationData && bestGeneration.percentage > 0) {
        const genOverallPromotion = document.createElement('div');
        genOverallPromotion.className = 'generation-overall-promotion';
        genOverallPromotion.innerHTML = `
            <div class="promo-highlight">
                🏅 Your strongest generation is <strong>${bestGeneration.gen}</strong> with ${bestGeneration.percentage.toFixed(1)}% completion!
            </div>
            <a href="https://pokebinderdx.github.io/#solodex" target="_blank" class="generation-promo-link">
                Discover awesome ways to showcase it with SoloDex →
            </a>
        `;
        genCard.appendChild(genOverallPromotion);
    }
    
    if (hasGenerationData) {
        statsContainer.appendChild(genCard);
    }

    // Type statistics with promotions ET FOND COLORÉ
    if (Object.keys(stats.types).length > 0) {
        const typeCard = document.createElement('div');
        typeCard.className = 'stat-card type-stat';
        typeCard.innerHTML = '<h4>Type Statistics</h4>';
        
        // Find favorite type
        let favoriteType = { name: '', count: 0, percentage: 0 };
        Object.entries(stats.types).forEach(([type, data]) => {
            if (data.count > favoriteType.count) {
                favoriteType = { name: type, count: data.count, percentage: data.percentage };
            }
        });
        
        // Add type promotion header with colored background
        if (favoriteType.count > 0) {
            const typePromoHeader = document.createElement('div');
            typePromoHeader.className = 'type-promotion-header';
            
            // Obtenir la couleur du type favori
            const typeColor = TYPE_COLORS[favoriteType.name] || '#A8A878';
            const typeBgColor = TYPE_BACKGROUND_COLORS[favoriteType.name] || '#A8A87820';
            
            typePromoHeader.style.background = `linear-gradient(135deg, ${typeBgColor}, ${typeColor}15)`;
            typePromoHeader.style.border = `2px solid ${typeColor}30`;
            typePromoHeader.style.borderRadius = '12px';
            typePromoHeader.style.padding = '15px';
            typePromoHeader.style.marginBottom = '15px';
            
            typePromoHeader.innerHTML = `
                <div class="favorite-type-highlight" style="color: ${typeColor};">
                    <img src="assets/types/${favoriteType.name.toLowerCase()}.png" class="favorite-type-icon" alt="${favoriteType.name}" onerror="this.style.display='none'">
                    <span style="font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">Your favorite type is ${favoriteType.name}!</span>
                </div>
                <a href="https://pokebinderdx.github.io/#solodex" target="_blank" class="type-analysis-link" 
                   style="background: ${typeColor}; color: white; padding: 8px 16px; border-radius: 20px; text-decoration: none; font-weight: bold; box-shadow: 0 2px 8px ${typeColor}40;">
                    ${favoriteType.name} pokemons deserves great pdfs : SoloDex →
                </a>
            `;
            typeCard.appendChild(typePromoHeader);
        }
        
        // Créer la grille pour les types
        const typeGrid = document.createElement('div');
        typeGrid.className = 'type-stats-grid';
        
        Object.entries(stats.types)
            .sort(([,a], [,b]) => b.count - a.count)
            .forEach(([type, data]) => {
                const typeStatItem = document.createElement('div');
                typeStatItem.className = 'type-stat-item';
                
                // Obtenir la couleur pour ce type
                const typeColor = TYPE_COLORS[type] || '#A8A878';
                const typeBgColor = TYPE_BACKGROUND_COLORS[type] || '#A8A87820';
                
                // Appliquer la couleur de fond si c'est le type favori
                if (type === favoriteType.name) {
                    typeStatItem.style.background = `linear-gradient(135deg, ${typeBgColor}, ${typeColor}10)`;
                    typeStatItem.style.border = `2px solid ${typeColor}50`;
                }
                
                // Calculate percentage of this type in total Pokedex
                const totalOfThisType = getTotalPokemonOfType(type);
                const globalTypePercentage = totalOfThisType > 0 ? (data.count / totalOfThisType) * 100 : 0;
                
                typeStatItem.innerHTML = `
                    <div class="type-stat-header">
                        <div class="type-label-with-icon">
                            <img src="assets/types/${type.toLowerCase()}.png" class="type-icon" alt="${type}" onerror="this.style.display='none'">
                            <span class="stat-label" style="color: ${typeColor}; font-weight: bold;">${type}</span>
                        </div>
                        <span class="type-main-value" style="color: ${typeColor};">${data.count} (${data.percentage.toFixed(1)}%)</span>
                    </div>
                    <div class="type-stat-bar">
                        <div class="type-stat-bar-fill" style="background: linear-gradient(90deg, ${typeColor}, ${typeColor}80); width: ${data.percentage}%"></div>
                    </div>
                    <div class="type-details-compact">
                        <div class="type-global-stat">Global ${type}: ${globalTypePercentage.toFixed(1)}% (${data.count}/${totalOfThisType})</div>
                        ${Object.entries(data.generationBreakdown)
                            .filter(([, count]) => count > 0)
                            .map(([gen, count]) => {
                                const genTotalOfType = getTotalPokemonOfTypeInGeneration(type, gen);
                                const genPercentage = genTotalOfType > 0 ? (count / genTotalOfType) * 100 : 0;
                                return `<div class="type-breakdown-compact">
                                    <span>${gen}:</span>
                                    <span>${genPercentage.toFixed(1)}% (${count}/${genTotalOfType})</span>
                                </div>`;
                            }).join('')}
                    </div>
                `;
                typeGrid.appendChild(typeStatItem);
            });
        
        typeCard.appendChild(typeGrid);
        statsContainer.appendChild(typeCard);
    }

    // Rest of the function remains the same...
    // Special statistics with promotions
    if (stats.legendary.count > 0 || stats.starter.count > 0) {
        const specialCard = document.createElement('div');
        specialCard.className = 'stat-card special-stat';
        specialCard.innerHTML = '<h4>Special Statistics</h4>';
        
        if (stats.legendary.count > 0) {
            const legendaryItem = document.createElement('div');
            legendaryItem.className = 'stat-item';
            
            let legendaryPromo = '';
            if (stats.legendary.percentage >= 50) {
                legendaryPromo = `
                    <div class="special-promotion legendary-master">
                        ✨ Legendary Master! You've caught ${stats.legendary.count} legendary Pokemon!
                        <a href="https://pokebinderdx.github.io/#solodex" target="_blank" class="special-promo-link">
                            Show off your legendary collection →
                        </a>
                    </div>
                `;
            } else if (stats.legendary.count >= 10) {
                legendaryPromo = `
                    <div class="special-promotion legendary-hunter">
                        🔮 Legendary Hunter! Keep seeking those rare Pokemon!
                    </div>
                `;
            }
            
            legendaryItem.innerHTML = `
                <span class="stat-label">Legendary Pokemon</span>
                <div>
                    <span class="stat-value">${stats.legendary.count}/${LEGENDARY_POKEMON.size} (${stats.legendary.percentage.toFixed(1)}%)</span>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width: ${Math.min(stats.legendary.percentage, 100)}%"></div>
                    </div>
                    ${legendaryPromo}
                </div>
            `;
            specialCard.appendChild(legendaryItem);
        }
        
        if (stats.starter.count > 0) {
            const starterItem = document.createElement('div');
            starterItem.className = 'stat-item';
            
            let starterPromo = '';
            if (stats.starter.percentage >= 75) {
                starterPromo = `
                    <div class="special-promotion starter-master">
                        🌟 Starter Collector! You have most starter Pokemon!
                        <a href="https://pokebinderdx.github.io/#solodex" target="_blank" class="special-promo-link">
                            Organize your collection →
                        </a>
                    </div>
                `;
            } else if (stats.starter.count >= 5) {
                starterPromo = `
                    <div class="special-promotion starter-fan">
                        🔥 Starter enthusiast! Great starter collection!
                    </div>
                `;
            }
            
            starterItem.innerHTML = `
                <span class="stat-label">Starter Pokemon</span>
                <div>
                    <span class="stat-value">${stats.starter.count}/${STARTER_POKEMON.size} (${stats.starter.percentage.toFixed(1)}%)</span>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width: ${Math.min(stats.starter.percentage, 100)}%"></div>
                    </div>
                    ${starterPromo}
                </div>
            `;
            specialCard.appendChild(starterItem);
        }
        
        statsContainer.appendChild(specialCard);
    }
    
    // Add final call-to-action card
    const ctaCard = document.createElement('div');
    ctaCard.className = 'stat-card cta-card';
    ctaCard.innerHTML = `
        <div class="cta-content">
            <div class="cta-header">
                <span class="cta-icon">🎯</span>
                <h4>Ready to level up your collection?</h4>
            </div>
            <p class="cta-description">
                Discover great ways to organize your collection !
            </p>
            <div class="cta-buttons">
                <a href="https://pokebinderdx.github.io/#solodex" target="_blank" class="cta-primary">
                    🔍 Explore SoloDex Collection
                </a>
                <a href="https://pokebinderdx.github.io" target="_blank" class="cta-secondary">
                    📊 PokeBinderDex Hub
                </a>
            </div>
        </div>
    `;
    statsContainer.appendChild(ctaCard);
    
    resultsList.appendChild(statsContainer);
}

// Helper function to get total Pokemon of a specific type in the entire Pokedex
function getTotalPokemonOfType(type) {
    const pokemonMap = parsePokemonData();
    let count = 0;
    
    for (let pokemon of pokemonMap.values()) {
        if (pokemon.type1 === type || pokemon.type2 === type) {
            count++;
        }
    }
    
    return count;
}

// Helper function to get total Pokemon of a specific type in a generation
function getTotalPokemonOfTypeInGeneration(type, generation) {
    const pokemonMap = parsePokemonData();
    const genRange = GENERATIONS[generation];
    let count = 0;
    
    for (let pokemon of pokemonMap.values()) {
        if (pokemon.number >= genRange.min && pokemon.number <= genRange.max) {
            if (pokemon.type1 === type || pokemon.type2 === type) {
                count++;
            }
        }
    }
    
    return count;
}

// Utility functions
function showLoading() {
    loading.classList.add('show');
}

function hideLoading() {
    loading.classList.remove('show');
}

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        if (errorList) errorList.innerHTML = '';
        error.classList.add('show');
    }
}

function hideError() {
    error.classList.remove('show');
}

function hideResults() {
    results.classList.remove('show');
}

// Expose necessary functions globally
window.handleFileSelect = handleFileSelect;
window.scanImage = scanImage;
window.removeImage = window.removeImage;
window.clearQueue = window.clearQueue;

// Génération PDF avec source d'image
async function generatePDFChecklist(detectedPokemon, language) {
    const pdfBtn = document.getElementById('downloadPdfBtn');
    const originalText = pdfBtn.innerHTML;
    
    try {
        // Show loading state
        pdfBtn.classList.add('generating');
        pdfBtn.innerHTML = '⏳ Generating PDF...';
        pdfBtn.disabled = true;
        
        // Small delay to show the loading state
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const pokedex = POKEDEX[language] || POKEDEX['en'];
        const languageName = LANGUAGE_NAMES[language] || 'English';
        const pokemonMap = parsePokemonData();
        
        // Create a map of detected Pokemon with their image sources
        const detectedPokemonMap = new Map();
        detectedPokemon.forEach(pokemon => {
            const normalizedName = pokemon.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            detectedPokemonMap.set(normalizedName, pokemon.imageSource);
        });
        
        // Title
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text(`Pokemon Checklist - ${languageName}`, 20, 20);
        
        // Subtitle with stats
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        const stats = calculateStats(detectedPokemon);
        doc.text(`Collection: ${stats.global.total}/1025 (${stats.global.percentage.toFixed(1)}%)`, 20, 35);
        doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 45);
        
        // Add a line separator
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 50, 190, 50);
        
        let yPosition = 65;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        let pageNumber = 1;
        
        // Set font for checklist
        doc.setFontSize(9);
        
        // Add page number
        doc.setFontSize(8);
        doc.text(`Page ${pageNumber}`, 180, pageHeight - 10);
        doc.setFontSize(9);
        
        // Generate checklist for all Pokemon
        for (let i = 0; i < pokedex.length && i < 1025; i++) {
            const pokemonNumber = i + 1;
            const pokemonName = pokedex[i];
            const pokemonData = pokemonMap.get(pokemonNumber);
            
            // Check if Pokemon was detected and get its image source
            const normalizedName = pokemonName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const isDetected = detectedPokemonMap.has(normalizedName);
            const imageSource = detectedPokemonMap.get(normalizedName);
            
            // Check if we need a new page
            if (yPosition > pageHeight - 30) {
                doc.addPage();
                pageNumber++;
                yPosition = 20;
                
                // Add page number
                doc.setFontSize(8);
                doc.text(`Page ${pageNumber}`, 180, pageHeight - 10);
                doc.setFontSize(9);
            }
            
            // Draw checkbox
            const checkboxSize = 3;
            doc.setDrawColor(0, 0, 0);
            doc.rect(margin, yPosition - 2.5, checkboxSize, checkboxSize);
            
            // Fill checkbox if Pokemon is detected
            if (isDetected) {
                doc.setFillColor(34, 197, 94); // Green
                doc.rect(margin + 0.3, yPosition - 2.2, checkboxSize - 0.6, checkboxSize - 0.6, 'F');
                
                // Add checkmark
                doc.setDrawColor(255, 255, 255);
                doc.setLineWidth(0.5);
                doc.line(margin + 0.8, yPosition - 1.2, margin + 1.3, yPosition - 0.7);
                doc.line(margin + 1.3, yPosition - 0.7, margin + 2.2, yPosition - 1.8);
                doc.setLineWidth(0.2);
                doc.setDrawColor(0, 0, 0);
            }
            
            // Pokemon number and name
            const numberText = `#${pokemonNumber.toString().padStart(3, '0')}`;
            doc.setFont(undefined, 'bold');
            doc.text(numberText, margin + 8, yPosition);
            
            doc.setFont(undefined, 'normal');
            if (isDetected) {
                doc.setTextColor(34, 197, 94); // Green for detected Pokemon
                doc.setFont(undefined, 'bold');
            }
            doc.text(pokemonName, margin + 28, yPosition);
            
            // Add type information if available
            if (pokemonData) {
                let typeText = pokemonData.type1;
                if (pokemonData.type2) {
                    typeText += ` / ${pokemonData.type2}`;
                }
                doc.setFont(undefined, 'normal');
                doc.setTextColor(120, 120, 120);
                doc.text(typeText, margin + 85, yPosition);
            }
            
            // Add generation info
            Object.entries(GENERATIONS).forEach(([gen, range]) => {
                if (pokemonNumber >= range.min && pokemonNumber <= range.max) {
                    doc.setTextColor(150, 150, 150);
                    doc.text(gen, margin + 125, yPosition);
                }
            });
            
            // Add image source if detected
            if (isDetected && imageSource) {
                doc.setTextColor(70, 130, 255); // Blue for image source
                doc.setFont(undefined, 'italic');
                doc.text(`Img ${imageSource}`, margin + 150, yPosition);
            }
            
            // Reset color and font
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
            
            yPosition += 5;
        }
        
        // Add summary page at the end
        doc.addPage();
        pageNumber++;
        doc.setFontSize(8);
        doc.text(`Page ${pageNumber}`, 180, pageHeight - 10);
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Collection Summary', 20, 20);
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        yPosition = 40;
        
        // Global stats
        doc.text(`Total Pokemon Collected: ${stats.global.total}/1025 (${stats.global.percentage.toFixed(1)}%)`, 20, yPosition);
        yPosition += 15;
        
        // Generation stats
        if (Object.values(stats.generations).some(gen => gen.count > 0)) {
            doc.setFont(undefined, 'bold');
            doc.text('Generation Breakdown:', 20, yPosition);
            doc.setFont(undefined, 'normal');
            yPosition += 10;
            
            Object.entries(stats.generations).forEach(([gen, data]) => {
                if (data.count > 0) {
                    const genInfo = GENERATIONS[gen];
                    const genTotal = genInfo.max - genInfo.min + 1;
                    doc.text(`  ${gen} (${genInfo.name}): ${data.count}/${genTotal} (${data.percentage.toFixed(1)}%)`, 25, yPosition);
                    yPosition += 8;
                }
            });
            yPosition += 10;
        }
        
        // Type stats
        if (Object.keys(stats.types).length > 0) {
            doc.setFont(undefined, 'bold');
            doc.text('Most Common Types in Collection:', 20, yPosition);
            doc.setFont(undefined, 'normal');
            yPosition += 10;
            
            Object.entries(stats.types)
                .sort(([,a], [,b]) => b.count - a.count)
                .slice(0, 8) // Top 8 types
                .forEach(([type, data]) => {
                    doc.text(`  ${type}: ${data.count} Pokemon (${data.percentage.toFixed(1)}% of collection)`, 25, yPosition);
                    yPosition += 8;
                });
        }
        
        // Special Pokemon stats
        if (stats.legendary.count > 0 || stats.starter.count > 0) {
            yPosition += 10;
            doc.setFont(undefined, 'bold');
            doc.text('Special Pokemon:', 20, yPosition);
            doc.setFont(undefined, 'normal');
            yPosition += 10;
            
            if (stats.legendary.count > 0) {
                doc.text(`  Legendary Pokemon: ${stats.legendary.count}/${LEGENDARY_POKEMON.size} (${stats.legendary.percentage.toFixed(1)}%)`, 25, yPosition);
                yPosition += 8;
            }
            
            if (stats.starter.count > 0) {
                doc.text(`  Starter Pokemon: ${stats.starter.count}/${STARTER_POKEMON.size} (${stats.starter.percentage.toFixed(1)}%)`, 25, yPosition);
                yPosition += 8;
            }
        }
        
        // Add detected Pokemon list with image sources
        if (detectedPokemon.length > 0) {
            yPosition += 15;
            doc.setFont(undefined, 'bold');
            doc.text('Detected Pokemon by Image:', 20, yPosition);
            doc.setFont(undefined, 'normal');
            yPosition += 10;
            
            // Group Pokemon by image source
            const pokemonByImage = new Map();
            detectedPokemon.forEach(pokemon => {
                const imageNum = pokemon.imageSource || 'Unknown';
                if (!pokemonByImage.has(imageNum)) {
                    pokemonByImage.set(imageNum, []);
                }
                pokemonByImage.get(imageNum).push(pokemon);
            });
            
            // Sort by image number
            const sortedImages = Array.from(pokemonByImage.keys()).sort((a, b) => {
                if (a === 'Unknown') return 1;
                if (b === 'Unknown') return -1;
                return parseInt(a) - parseInt(b);
            });
            
            sortedImages.forEach(imageNum => {
                const pokemonInImage = pokemonByImage.get(imageNum);
                
                // Check if we need a new page
                if (yPosition > pageHeight - 40) {
                    doc.addPage();
                    pageNumber++;
                    yPosition = 20;
                    
                    // Add page number
                    doc.setFontSize(8);
                    doc.text(`Page ${pageNumber}`, 180, pageHeight - 10);
                    doc.setFontSize(11);
                }
                
                doc.setFont(undefined, 'bold');
                doc.text(`Image ${imageNum}:`, 25, yPosition);
                doc.setFont(undefined, 'normal');
                yPosition += 8;
                
                pokemonInImage.forEach(pokemon => {
                    const pokedex = POKEDEX[pokemon.language] || POKEDEX['en'];
                    const index = pokedex.indexOf(pokemon.name);
                    const pokemonNumber = index !== -1 ? index + 1 : null;
                    
                    const pokemonText = pokemonNumber ? 
                        `  #${pokemonNumber.toString().padStart(3, '0')} ${pokemon.name}` : 
                        `  ${pokemon.name}`;
                    
                    doc.text(pokemonText, 30, yPosition);
                    yPosition += 6;
                    
                    // Check if we need a new page
                    if (yPosition > pageHeight - 30) {
                        doc.addPage();
                        pageNumber++;
                        yPosition = 20;
                        
                        // Add page number
                        doc.setFontSize(8);
                        doc.text(`Page ${pageNumber}`, 180, pageHeight - 10);
                        doc.setFontSize(11);
                    }
                });
                
                yPosition += 5; // Extra space between images
            });
        }
        
        // Save the PDF
        const fileName = `pokemon_checklist_${languageName.toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        // Show success state briefly
        pdfBtn.innerHTML = '✅ PDF Downloaded!';
        pdfBtn.classList.remove('generating');
        
        setTimeout(() => {
            pdfBtn.innerHTML = originalText;
            pdfBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        
        // Show error state
        pdfBtn.innerHTML = '❌ Error generating PDF';
        pdfBtn.classList.remove('generating');
        
        setTimeout(() => {
            pdfBtn.innerHTML = originalText;
            pdfBtn.disabled = false;
        }, 3000);
    }
}


// Add this to your existing scanner.js file

// Compact tutorial toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const tutorialToggleHeader = document.getElementById('tutorialToggleHeader');
    const tutorialContent = document.getElementById('tutorialContent');
    const tutorialArrow = document.getElementById('tutorialArrow');
    const tutorialCompact = document.querySelector('.tutorial-compact');
    
    if (tutorialToggleHeader && tutorialContent && tutorialArrow) {
        tutorialToggleHeader.addEventListener('click', function() {
            const isExpanded = tutorialContent.classList.contains('expanded');
            
            if (isExpanded) {
                // Collapse
                tutorialContent.classList.remove('expanded');
                tutorialCompact.classList.remove('expanded');

            } else {
                // Expand
                tutorialContent.classList.add('expanded');
                tutorialCompact.classList.add('expanded');
      
            }
        });
    }
    
    // Optional: Auto-collapse tutorial after successful scan
    window.autoCollapseTutorial = function() {
        if (tutorialContent && tutorialContent.classList.contains('expanded')) {
            setTimeout(() => {
                tutorialToggleHeader.click();
            }, 3000); // Auto-collapse after 3 seconds
        }
    };
});

// Call this function at the end of your successful scan to auto-collapse tutorial:
// if (typeof autoCollapseTutorial === 'function') {
//     autoCollapseTutorial();
// }








const PROPELLER_CONFIG = {
    ZONE_ID: "9871908", 
    VIDEO_DURATION: 120, // 2 minutes obligatoires
    FORCE_COMPLETION: true, // Pas de skip
    AD_TYPE: "interstitial_video", // Type le plus rémunérateur
    AUTO_CLOSE: false // L'utilisateur ne peut pas fermer
};

// Revenus estimés PropellerAds (plus élevés)
const PROPELLER_REVENUE_ESTIMATES = {
    interstitialVideo: 0.35, // 0.35€ par vidéo vue complètement
    popunder: 0.15, // 0.15€ par popunder
    push: 0.08, // 0.08€ par notification push
    bonus: 0.10 // Bonus si multiple interactions
};

// Variables globales
let propellerAdActive = false;
let propellerAdLoaded = false;
let adWatchTime = 0;
let totalEarnings = 0;
let adTimer = null;
let scanComplete = false;

// =======================================================================================
// ÉTAPE 1: INITIALISATION PROPELLERADS (SIMPLE)
// =======================================================================================

function initializePropellerAds() {
    // Script PropellerAds principal
    const script = document.createElement('script');
    script.src = 'https://iclickcdn.com/tag.min.js';
    script.setAttribute('data-zone', PROPELLER_CONFIG.ZONE_ID);
    script.async = true;
    
    script.onload = function() {
        console.log("PropellerAds initialisé avec succès");
        propellerAdLoaded = true;
        
        // Configuration des callbacks PropellerAds
        window.propellerCallbacks = {
            onInterstitialShow: function() {
                console.log("Vidéo interstitielle affichée");
                trackPropellerImpression();
            },
            onInterstitialClose: function() {
                console.log("Vidéo interstitielle fermée");
                handlePropellerClose();
            },
            onInterstitialClick: function() {
                console.log("Clic sur vidéo interstitielle");
                trackPropellerClick();
            }
        };
    };
    
    script.onerror = function() {
        console.warn("Échec chargement PropellerAds, utilisation fallback");
        loadFallbackVideoAd();
    };
    
    document.head.appendChild(script);
}

// =======================================================================================
// ÉTAPE 2: CRÉATION OVERLAY PERSONNALISÉ PROPELLERADS
// =======================================================================================

function createPropellerOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'propellerAdOverlay';
    overlay.className = 'propeller-overlay';
    
    overlay.innerHTML = `
        <div class="propeller-container">
            <div class="propeller-header">
                <div class="brand-section">
                    <h3>🧠 IA Premium en analyse...</h3>
                    <p>Analyse approfondie de votre collection Pokemon</p>
                </div>
                <div class="timer-section">
                    <div class="circular-timer">
                        <svg class="timer-ring" width="80" height="80">
                            <circle cx="40" cy="40" r="35" fill="transparent" stroke="#e0e0e0" stroke-width="6"/>
                            <circle id="timerProgress" cx="40" cy="40" r="35" fill="transparent" 
                                    stroke="#ff6b6b" stroke-width="6" stroke-linecap="round"
                                    style="stroke-dasharray: 220; stroke-dashoffset: 220;"/>
                        </svg>
                        <div class="timer-text">
                            <span id="timeRemaining">120</span>
                            <small>sec</small>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Zone vidéo PropellerAds + fallback -->
            <div class="video-zone">
                <!-- Zone PropellerAds (invisible au début) -->
                <div id="propeller-ad-zone" class="ad-zone-hidden">
                    <!-- PropellerAds s'injecte ici -->
                </div>
                
                <!-- Overlay visuel pendant l'attente -->
                <div id="propeller-loading" class="propeller-loading">
                    <div class="video-placeholder">
                        <div class="play-icon">▶</div>
                        <div class="loading-text">Chargement de la vidéo premium...</div>
                        <div class="dots-loader">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                </div>
                
                <!-- Fallback vidéo si PropellerAds échoue -->
                <div id="fallback-video-zone" class="fallback-zone" style="display: none;">
                    <video id="fallbackVideo" width="100%" height="100%" autoplay muted loop>
                        <source src="assets/ads/premium-pokemon.mp4" type="video/mp4">
                        <source src="assets/ads/collection-storage.mp4" type="video/mp4">
                    </video>
                    <div class="fallback-overlay">
                        <h4>Découvrez les produits Pokemon premium</h4>
                        <p>Accessoires professionnels pour collectionneurs exigeants</p>
                        <div class="fallback-cta">
                            <a href="https://lien-affiliation-premium.com" target="_blank" 
                               onclick="trackFallbackClick()" class="cta-button">
                                Voir la collection premium →
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Progression du scan -->
            <div class="scan-status">
                <div class="scan-title">Analyse IA Multi-Phase</div>
                <div class="scan-phases">
                    <div class="phase active" id="phase1">
                        <div class="phase-dot"></div>
                        <span>Extraction données</span>
                    </div>
                    <div class="phase" id="phase2">
                        <div class="phase-dot"></div>
                        <span>Reconnaissance IA</span>
                    </div>
                    <div class="phase" id="phase3">
                        <div class="phase-dot"></div>
                        <span>Analyse statistique</span>
                    </div>
                    <div class="phase" id="phase4">
                        <div class="phase-dot"></div>
                        <span>Rapport final</span>
                    </div>
                </div>
                <div class="scan-progress-bar">
                    <div class="scan-progress-fill" id="scanProgress"></div>
                </div>
            </div>

            <!-- Footer info -->
            <div class="propeller-footer">
                <div class="revenue-info">
                    <span class="revenue-badge">💰 Cette pub finance votre analyse gratuite</span>
                    <span class="no-skip">⏱ Visionnage requis - Pas de raccourci possible</span>
                </div>
            </div>
        </div>
    `;
    
    return overlay;
}

// =======================================================================================
// ÉTAPE 3: STYLES CSS OPTIMISÉS PROPELLERADS
// =======================================================================================

function injectPropellerStyles() {
    const styles = `
        .propeller-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(26,32,44,0.98) 100%);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            -webkit-user-select: none;
        }

        .propeller-container {
            background: linear-gradient(145deg, #ffffff 0%, #f7fafc 100%);
            border-radius: 20px;
            width: 90vw;
            max-width: 900px;
            height: 85vh;
            max-height: 650px;
            padding: 25px;
            box-shadow: 0 25px 60px rgba(0,0,0,0.4);
            display: flex;
            flex-direction: column;
            border: 2px solid rgba(255,255,255,0.1);
        }

        .propeller-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
            margin-bottom: 25px;
        }

        .brand-section h3 {
            color: #2d3748;
            font-size: 1.6em;
            margin-bottom: 8px;
            font-weight: 700;
        }

        .brand-section p {
            color: #4a5568;
            font-size: 1em;
            margin: 0;
        }

        .timer-section {
            position: relative;
        }

        .circular-timer {
            position: relative;
            width: 80px;
            height: 80px;
        }

        .timer-ring {
            transform: rotate(-90deg);
            transition: stroke-dashoffset 1s ease;
        }

        .timer-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #2d3748;
            font-weight: bold;
        }

        .timer-text span {
            font-size: 1.5em;
            display: block;
        }

        .timer-text small {
            font-size: 0.8em;
            opacity: 0.7;
        }

        .video-zone {
            flex: 1;
            background: #000;
            border-radius: 15px;
            position: relative;
            overflow: hidden;
            margin-bottom: 25px;
            min-height: 300px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .propeller-loading {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #1a202c, #2d3748);
        }

        .video-placeholder {
            text-align: center;
            color: white;
        }

        .play-icon {
            font-size: 4em;
            margin-bottom: 20px;
            color: #ff6b6b;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
        }

        .loading-text {
            font-size: 1.2em;
            margin-bottom: 20px;
            font-weight: 600;
        }

        .dots-loader {
            display: flex;
            justify-content: center;
            gap: 8px;
        }

        .dots-loader span {
            width: 8px;
            height: 8px;
            background: #ff6b6b;
            border-radius: 50%;
            animation: dotBounce 1.4s infinite ease-in-out both;
        }

        .dots-loader span:nth-child(1) { animation-delay: -0.32s; }
        .dots-loader span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes dotBounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }

        .fallback-zone {
            width: 100%;
            height: 100%;
            position: relative;
        }

        .fallback-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            color: white;
            padding: 25px;
            text-align: center;
        }

        .cta-button {
            background: linear-gradient(135deg, #ff6b6b, #feca57);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: bold;
            display: inline-block;
            margin-top: 15px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(255,107,107,0.3);
        }

        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255,107,107,0.4);
            color: white;
            text-decoration: none;
        }

        .scan-status {
            margin-bottom: 20px;
        }

        .scan-title {
            text-align: center;
            font-size: 1.1em;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 15px;
        }

        .scan-phases {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
        }

        .phase {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            opacity: 0.4;
            transition: opacity 0.3s ease;
        }

        .phase.active {
            opacity: 1;
        }

        .phase-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #e2e8f0;
            margin-bottom: 8px;
            transition: background 0.3s ease;
        }

        .phase.active .phase-dot {
            background: linear-gradient(135deg, #ff6b6b, #feca57);
            animation: pulse 2s infinite;
        }

        .phase span {
            font-size: 0.85em;
            text-align: center;
            color: #4a5568;
            font-weight: 500;
        }

        .scan-progress-bar {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
        }

        .scan-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #ff6b6b, #feca57);
            width: 0%;
            transition: width 0.5s ease;
            border-radius: 4px;
        }

        .propeller-footer {
            text-align: center;
            padding-top: 15px;
            border-top: 2px solid #e2e8f0;
        }

        .revenue-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
        }

        .revenue-badge {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 600;
        }

        .no-skip {
            color: #e53e3e;
            font-weight: bold;
            font-size: 0.9em;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .propeller-container {
                width: 95vw;
                height: 90vh;
                padding: 20px;
            }
            
            .propeller-header {
                flex-direction: column;
                gap: 15px;
                text-align: center;
            }
            
            .scan-phases {
                flex-wrap: wrap;
                gap: 15px;
            }
            
            .revenue-info {
                flex-direction: column;
                gap: 10px;
            }
        }

        /* Désactiver sélection et menu contextuel */
        .propeller-overlay * {
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
        }
    `;
    
    if (!document.querySelector('#propeller-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'propeller-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }
}

// =======================================================================================
// ÉTAPE 4: GESTION DU TIMING FORCÉ
// =======================================================================================

function startPropellerTimer() {
    let timeRemaining = PROPELLER_CONFIG.VIDEO_DURATION;
    let phaseIndex = 0;
    const phases = ['phase1', 'phase2', 'phase3', 'phase4'];
    
    adTimer = setInterval(() => {
        timeRemaining--;
        adWatchTime++;
        
        // Mise à jour affichage timer
        const timerElement = document.getElementById('timeRemaining');
        if (timerElement) {
            timerElement.textContent = timeRemaining;
        }
        
        // Animation cercle de progression
        const progressCircle = document.getElementById('timerProgress');
        if (progressCircle) {
            const progress = (adWatchTime / PROPELLER_CONFIG.VIDEO_DURATION) * 220;
            progressCircle.style.strokeDashoffset = 220 - progress;
        }
        
        // Mise à jour phases
        const currentPhase = Math.floor((adWatchTime / PROPELLER_CONFIG.VIDEO_DURATION) * phases.length);
        if (currentPhase > phaseIndex && currentPhase < phases.length) {
            document.getElementById(phases[phaseIndex])?.classList.remove('active');
            document.getElementById(phases[currentPhase])?.classList.add('active');
            phaseIndex = currentPhase;
        }
        
        // Mise à jour barre de progression
        const progressBar = document.getElementById('scanProgress');
        if (progressBar) {
            const progress = Math.min((adWatchTime / PROPELLER_CONFIG.VIDEO_DURATION) * 100, 100);
            progressBar.style.width = `${progress}%`;
        }
        
        // Vérifier conditions de fermeture
        if (timeRemaining <= 0 || (scanComplete && adWatchTime >= 90)) {
            clearInterval(adTimer);
            
            // Calcul revenus basé sur temps de visionnage
            const completionRate = adWatchTime / PROPELLER_CONFIG.VIDEO_DURATION;
            const earnings = PROPELLER_REVENUE_ESTIMATES.interstitialVideo * completionRate;
            totalEarnings += earnings;
            
            console.log(`PropellerAds: ${completionRate * 100}% vue - Gains: €${earnings.toFixed(3)}`);
            
            setTimeout(hidePropellerAd, 2000);
        }
    }, 1000);
}

// =======================================================================================
// ÉTAPE 5: CHARGEMENT PROPELLERADS + FALLBACK
// =======================================================================================

function triggerPropellerAd() {
    // Attendre que le script soit chargé
    if (!propellerAdLoaded) {
        setTimeout(triggerPropellerAd, 1000);
        return;
    }
    
    try {
        // Déclencher la publicité PropellerAds
        if (window.PropellerAds) {
            window.PropellerAds.show({
                zoneId: PROPELLER_CONFIG.ZONE_ID,
                type: 'interstitial'
            });
            
            console.log("PropellerAds interstitielle déclenchée");
            
            // Masquer le loading et montrer la zone PropellerAds
            setTimeout(() => {
                const loading = document.getElementById('propeller-loading');
                if (loading) loading.style.display = 'none';
            }, 3000);
            
        } else {
            throw new Error("PropellerAds non disponible");
        }
    } catch (error) {
        console.warn("Erreur PropellerAds, utilisation fallback:", error);
        loadFallbackVideoAd();
    }
}

function loadFallbackVideoAd() {
    const loading = document.getElementById('propeller-loading');
    const fallback = document.getElementById('fallback-video-zone');
    const video = document.getElementById('fallbackVideo');
    
    if (loading) loading.style.display = 'none';
    if (fallback) {
        fallback.style.display = 'block';
        console.log("Fallback vidéo locale activé");
        
        if (video) {
            video.play().catch(() => {
                console.log("Autoplay bloqué, interaction requise");
            });
        }
    }
}

// =======================================================================================
// ÉTAPE 6: FONCTIONS DE TRACKING
// =======================================================================================

function trackPropellerImpression() {
    console.log("Impression PropellerAds trackée");
    
    // Google Analytics si disponible
    if (typeof gtag !== 'undefined') {
        gtag('event', 'propeller_impression', {
            'event_category': 'monetization',
            'event_label': 'pokemon_scanner',
            'value': 1
        });
    }
}

function trackPropellerClick() {
    const clickRevenue = PROPELLER_REVENUE_ESTIMATES.interstitialVideo * 1.5; // Bonus clic
    totalEarnings += clickRevenue;
    
    console.log(`Clic PropellerAds - Bonus: €${clickRevenue.toFixed(3)}`);
    
    if (typeof gtag !== 'undefined') {
        gtag('event', 'propeller_click', {
            'event_category': 'monetization',
            'event_label': 'pokemon_scanner',
            'value': clickRevenue
        });
    }
}

function trackFallbackClick() {
    const affiliateRevenue = PROPELLER_REVENUE_ESTIMATES.popunder;
    totalEarnings += affiliateRevenue;
    
    console.log(`Clic affiliation fallback: €${affiliateRevenue.toFixed(3)}`);
}

function handlePropellerClose() {
    // Ne pas fermer immédiatement, forcer le timing minimum
    console.log("Tentative fermeture PropellerAds - maintien forcé");
}

// =======================================================================================
// ÉTAPE 7: FONCTIONS PRINCIPALES
// =======================================================================================

function showPropellerAd() {
    if (propellerAdActive) return;
    
    console.log("Affichage publicité PropellerAds...");
    propellerAdActive = true;
    scanComplete = false;
    adWatchTime = 0;
    
    // Injection styles et création interface
    injectPropellerStyles();
    const overlay = createPropellerOverlay();
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    // Désactiver raccourcis clavier
    document.addEventListener('keydown', preventEscape, {capture: true});
    document.addEventListener('contextmenu', preventRightClick, {capture: true});
    
    // Démarrer timer
    startPropellerTimer();
    
    // Déclencher la pub PropellerAds
    setTimeout(triggerPropellerAd, 2000);
}

function hidePropellerAd() {
    const overlay = document.getElementById('propellerAdOverlay');
    if (overlay) {
        overlay.remove();
    }
    
    document.body.style.overflow = '';
    document.removeEventListener('keydown', preventEscape, {capture: true});
    document.removeEventListener('contextmenu', preventRightClick, {capture: true});
    
    propellerAdActive = false;
    
    console.log(`Session PropellerAds terminée - Total gagné: €${totalEarnings.toFixed(3)}`);
}

function preventEscape(e) {
    // Bloquer Esc, F5, Ctrl+R, Alt+F4
    const blocked = [27, 116, 123];
    if (blocked.includes(e.keyCode) || 
        (e.ctrlKey && e.keyCode === 82) || 
        (e.altKey && e.keyCode === 115)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
}

function preventRightClick(e) {
    e.preventDefault();
    return false;
}

// =======================================================================================
// ÉTAPE 8: INTÉGRATION AVEC VOTRE SCANNER EXISTANT
// =======================================================================================

// Sauvegarder votre fonction originale
const originalProcessAllImages = processAllImages;

// Nouvelle fonction avec PropellerAds intégré
async function processAllImages() {
    if (isProcessing || imageQueue.length === 0) return;
    
    console.log("Démarrage scan avec PropellerAds...");
    
    // Afficher la publicité PropellerAds
    showPropellerAd();
    
    // Attendre un délai puis lancer le scan en arrière-plan
    setTimeout(async () => {
        try {
            await originalProcessAllImages.call(this);
            scanComplete = true;
            console.log("Scan terminé - PropellerAds continue selon timing");
        } catch (error) {
            console.error("Erreur scan:", error);
            scanComplete = true;
            throw error;
        }
    }, 5000); // 5s de délai pour laisser la pub se charger
}

// =======================================================================================
// ÉTAPE 9: INITIALISATION
// =======================================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser PropellerAds
    initializePropellerAds();
    
    console.log("PropellerAds initialisé - Zone ID:", PROPELLER_CONFIG.ZONE_ID);
});

// =======================================================================================
// ÉTAPE 10: DEBUG ET STATISTIQUES
// =======================================================================================

function getPropellerStats() {
    const sessionsToday = parseInt(localStorage.getItem('propeller_sessions_today') || '0');
    const dailyEarnings = parseFloat(localStorage.getItem('propeller_earnings_today') || '0');
    
    return {
        totalEarnings: totalEarnings,
        dailyEarnings: dailyEarnings,
        sessionsToday: sessionsToday,
        averageEarningsPerSession: sessionsToday > 0 ? dailyEarnings / sessionsToday : 0,
        estimatedMonthly: dailyEarnings * 30
    };
}

// Debug console
window.propellerDebug = {
    show: showPropellerAd,
    hide: hidePropellerAd,
    stats: getPropellerStats,
    forceComplete: () => { scanComplete = true; },
    earnings: () => totalEarnings
};

console.log("PropellerAds Video System chargé - Revenus estimés: €0.25-0.75 par utilisation");


