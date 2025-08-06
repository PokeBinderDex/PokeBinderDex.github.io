// Pokemon Scanner - PokeBinderDex
// Version with multi-image processing

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
    queueCount.textContent = `${imageQueue.length} image(s) en attente`;
    
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
        
        // Compiler tous les Pokémon détectés
        const allDetectedPokemon = compileAllDetectedPokemon(selectedLang);
        
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

// Compiler tous les Pokémon détectés depuis toutes les images
function compileAllDetectedPokemon(language) {
    const allPokemon = [];
    const pokemonNames = new Set(); // Pour éviter les doublons
    
    processedResults.forEach(imageItem => {
        const { details } = imageItem.result;
        
        if (details && details.includes('**Détails des détections :**')) {
            const imagePokemon = parseImageResults(details, language);
            
            imagePokemon.forEach(pokemon => {
                const normalizedName = pokemon.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (!pokemonNames.has(normalizedName)) {
                    pokemonNames.add(normalizedName);
                    allPokemon.push(pokemon);
                }
            });
        }
    });
    
    return allPokemon;
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
    progressText.textContent = `${current} / ${total} images traitées`;
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

// Display statistics - VERSION ORIGINALE CONSERVÉE
function displayStats(stats) {
    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';
    
    // Global statistics
    const globalCard = document.createElement('div');
    globalCard.className = 'stat-card global-stat';
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
    `;
    statsContainer.appendChild(globalCard);

    // Generation statistics
    const genCard = document.createElement('div');
    genCard.className = 'stat-card gen-stat';
    genCard.innerHTML = '<h4>Generation Statistics</h4>';
    
    Object.entries(stats.generations).forEach(([gen, data]) => {
        const genInfo = GENERATIONS[gen];
        if (data.count > 0) {
            const genTotal = genInfo.max - genInfo.min + 1;
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            statItem.innerHTML = `
                <span class="stat-label">${gen} (${genInfo.name})</span>
                <div>
                    <span class="stat-value">${data.count}/${genTotal} (${data.percentage.toFixed(1)}%)</span>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width: ${Math.min(data.percentage, 100)}%"></div>
                    </div>
                </div>
            `;
            genCard.appendChild(statItem);
        }
    });
    
    if (Object.values(stats.generations).some(gen => gen.count > 0)) {
        statsContainer.appendChild(genCard);
    }

    // Type statistics with detailed breakdown
    if (Object.keys(stats.types).length > 0) {
        const typeCard = document.createElement('div');
        typeCard.className = 'stat-card type-stat';
        typeCard.innerHTML = '<h4>Type Statistics</h4>';
        
        Object.entries(stats.types)
            .sort(([,a], [,b]) => b.count - a.count)
            .forEach(([type, data]) => {
                const statItem = document.createElement('div');
                statItem.className = 'stat-item';
                
                // Calculate percentage of this type in total Pokedex
                const totalOfThisType = getTotalPokemonOfType(type);
                const globalTypePercentage = totalOfThisType > 0 ? (data.count / totalOfThisType) * 100 : 0;
                
                statItem.innerHTML = `
                    <span class="stat-label">
                        <img src="assets/types/${type.toLowerCase()}.png" class="type-icon" alt="${type}" onerror="this.style.display='none'">
                        ${type}
                    </span>
                    <div>
                        <span class="stat-value">${data.count} (${data.percentage.toFixed(1)}% of collection)</span>
                        <div class="stat-bar">
                            <div class="stat-bar-fill" style="width: ${data.percentage}%"></div>
                        </div>
                        <div class="type-details">
                            <div>Global ${type}: ${globalTypePercentage.toFixed(1)}% (${data.count}/${totalOfThisType})</div>
                            ${Object.entries(data.generationBreakdown)
                                .filter(([, count]) => count > 0)
                                .map(([gen, count]) => {
                                    const genTotalOfType = getTotalPokemonOfTypeInGeneration(type, gen);
                                    const genPercentage = genTotalOfType > 0 ? (count / genTotalOfType) * 100 : 0;
                                    return `<div class="type-breakdown">
                                        <span>${gen}:</span>
                                        <span>${genPercentage.toFixed(1)}% (${count}/${genTotalOfType})</span>
                                    </div>`;
                                }).join('')}
                        </div>
                    </div>
                `;
                typeCard.appendChild(statItem);
            });
        
        statsContainer.appendChild(typeCard);
    }

    // Special statistics
    const specialCard = document.createElement('div');
    specialCard.className = 'stat-card';
    specialCard.innerHTML = '<h4>Special Statistics</h4>';
    
    if (stats.legendary.count > 0) {
        const legendaryItem = document.createElement('div');
        legendaryItem.className = 'stat-item';
        legendaryItem.innerHTML = `
            <span class="stat-label">Legendary Pokemon</span>
            <div>
                <span class="stat-value">${stats.legendary.count}/${LEGENDARY_POKEMON.size} (${stats.legendary.percentage.toFixed(1)}%)</span>
                <div class="stat-bar">
                    <div class="stat-bar-fill" style="width: ${Math.min(stats.legendary.percentage, 100)}%"></div>
                </div>
            </div>
        `;
        specialCard.appendChild(legendaryItem);
    }
    
    if (stats.starter.count > 0) {
        const starterItem = document.createElement('div');
        starterItem.className = 'stat-item';
        starterItem.innerHTML = `
            <span class="stat-label">Starter Pokemon</span>
            <div>
                <span class="stat-value">${stats.starter.count}/${STARTER_POKEMON.size} (${stats.starter.percentage.toFixed(1)}%)</span>
                <div class="stat-bar">
                    <div class="stat-bar-fill" style="width: ${Math.min(stats.starter.percentage, 100)}%"></div>
                </div>
            </div>
        `;
        specialCard.appendChild(starterItem);
    }
    
    if (stats.legendary.count > 0 || stats.starter.count > 0) {
        statsContainer.appendChild(specialCard);
    }
    
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

// Génération PDF - VERSION ORIGINALE CONSERVÉE
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
        
        // Create a set of detected Pokemon names for quick lookup
        const detectedNames = new Set(
            detectedPokemon.map(p => p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
        );
        
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
            
            // Check if Pokemon was detected
            const normalizedName = pokemonName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const isDetected = detectedNames.has(normalizedName);
            
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
                    doc.text(gen, margin + 140, yPosition);
                }
            });
            
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
