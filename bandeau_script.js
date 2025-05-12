document.addEventListener('DOMContentLoaded', function() {
    const bandeau = document.querySelector('.bandeau');
    const content = document.querySelector('.bandeau-content');
    const images = content.querySelectorAll('img');
    
    // Wait for images to load
    function initBandeau() {
        // Calculate total width of original 13 images
        let totalWidth = 0;
        for (let i = 0; i < 13; i++) {
            totalWidth += images[i].offsetWidth + 20; // width + margin
        }
        
        // Set animation duration based on width (adjust 100px for speed)
        const duration = Math.max(20, totalWidth / 100); 
        
        // Create keyframes dynamically
        const style = document.createElement('style');
        style.textContent = `
            @keyframes bandeauScroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(-${totalWidth}px); }
            }
            .bandeau-content {
                animation: bandeauScroll ${duration}s linear infinite;
            }
        `;
        document.head.appendChild(style);
    }
    
    // If all images are already loaded
    if (document.readyState === 'complete') {
        initBandeau();
    } else {
        window.addEventListener('load', initBandeau);
        // Fallback in case load event doesn't fire
        setTimeout(initBandeau, 3000);
    }
});
