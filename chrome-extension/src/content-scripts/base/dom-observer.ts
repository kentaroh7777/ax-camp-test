export class DOMObserver {
  private observer: MutationObserver | null = null;
  
  observe(target: Element, options: MutationObserverInit, callback: () => void): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.observer = new MutationObserver((mutations) => {
      let hasRelevantChanges = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          hasRelevantChanges = true;
        }
      });
      
      if (hasRelevantChanges) {
        callback();
      }
    });
    
    this.observer.observe(target, options);
  }
  
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}