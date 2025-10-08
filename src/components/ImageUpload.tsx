import { useRef } from 'react';
import { supabase } from '../utils/supabaseClient';

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUploaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 5MB permitido.');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Solo se permiten archivos jpg, png o webp.');
      return;
    }

    try {
      // Upload to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('chat_uploads')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat_uploads')
        .getPublicUrl(data.path);

      onImageUploaded(publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen. Por favor intenta de nuevo.');
    }
  };

  return (
    <div className="image-upload-buttons">
      <button
        onClick={() => cameraInputRef.current?.click()}
        className="image-button"
        type="button"
        title="Tomar foto"
      >
        📷
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="image-button"
        type="button"
        title="Adjuntar imagen"
      >
        📎
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ImageUpload;
