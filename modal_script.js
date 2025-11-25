(function(){
    const overlay = document.getElementById('bfModal');
    const closeBtn = document.getElementById('bfClose');
    const copyBtn = document.getElementById('bfCopy');
    const codeEl = document.getElementById('bfCode');

    const progress = document.getElementById('bfProgress');
    let progressTimeout = null;

    function startProgress(duration = 6000){
        if(!progress) return;
        // ensure starting from 0
        progress.style.transition = 'none';
        progress.style.width = '0%';
        progress.setAttribute('aria-valuenow','0');
        // force style flush
        void progress.offsetWidth;
        // animate to full track width (account for left/right padding)
        progress.style.transition = `width ${duration}ms linear`;
        progress.style.width = 'calc(100% - 16px)';
        progressTimeout = setTimeout(()=>{
            hideModal();
            resetProgress();
        }, duration);
    }

    function resetProgress(){
        if(!progress) return;
        progress.style.transition = '';
        progress.style.width = '0%';
        progress.setAttribute('aria-valuenow','0');
        if(progressTimeout){ clearTimeout(progressTimeout); progressTimeout = null; }
    }

    function showModal(){
        if(!overlay) return;
        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden','false');
        // start the 6s progress then auto-close
        startProgress(6000);
    }

    function hideModal(){
        if(!overlay) return;
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden','true');
        resetProgress();
    }

    function copyCode(){
        if(!codeEl || !copyBtn) return;
        const code = codeEl.textContent.trim();
        if(navigator.clipboard && navigator.clipboard.writeText){
            navigator.clipboard.writeText(code).then(()=>{
                copyBtn.textContent = 'Copied!';
                setTimeout(()=> copyBtn.textContent = 'Copy code', 1800);
            }).catch(()=> fallbackCopy(code));
        } else {
            fallbackCopy(code);
        }
    }

    function fallbackCopy(text){
        if(!copyBtn) return;
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta);
        ta.select(); try{ document.execCommand('copy'); copyBtn.textContent='Copied!'; setTimeout(()=>copyBtn.textContent='Copy code',1800);}catch(e){}
        ta.remove();
    }

    document.addEventListener('DOMContentLoaded', ()=>{
        // always show the promo on each page load
        setTimeout(showModal, 450);
    });

    if(closeBtn) closeBtn.addEventListener('click', hideModal);
    if(overlay) overlay.addEventListener('click', (e)=>{ if(e.target === overlay) hideModal(); });
    if(copyBtn) copyBtn.addEventListener('click', copyCode);
    document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') hideModal(); });
})();
