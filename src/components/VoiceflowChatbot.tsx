import { useEffect } from 'react';

declare global {
  interface Window {
    voiceflow?: {
      chat: {
        load: (config: any) => Promise<void>;
        open: () => void;
        destroy: () => void;
      };
    };
  }
}

const VoiceflowChat = () => {
  useEffect(() => {
    // Initialize flag to track script load status
    let scriptLoaded = false;
    let script: HTMLScriptElement | null = null;

    const initializeChat = async () => {
      try {
        await window.voiceflow?.chat.load({
          verify: { projectID: '67f9368519f6e9bfcac985e1' },
          url: 'https://general-runtime.voiceflow.com',
          versionID: 'production',
          voice: { url: "https://runtime-api.voiceflow.com" }
        });
        window.voiceflow?.chat.open();
      } catch (error) {
        console.error('Error initializing Voiceflow chat:', error);
      }
    };

    // Check if script is already loaded
    if (!window.voiceflow) {
      script = document.createElement('script');
      script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
      script.type = 'text/javascript';
      script.async = true;
      
      script.onload = () => {
        scriptLoaded = true;
        initializeChat();
      };
      
      script.onerror = () => console.error('Error loading Voiceflow script');
      document.body.appendChild(script);
    } else if (window.voiceflow.chat) {
      initializeChat();
    }

    // Cleanup function
    return () => {
      if (window.voiceflow?.chat) {
        window.voiceflow.chat.destroy();
      }
      if (script && !scriptLoaded) {
        script.onload = null;
        document.body.removeChild(script);
      }
    };
  }, []);

  return null; // Component doesn't render any UI
};

export default VoiceflowChat;