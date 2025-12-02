const CLOUDINARY_CLOUD_NAME = 'dez0otycm'; 
const CLOUDINARY_UPLOAD_PRESET = 'chc_images'; 
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export const uploadImageToCloudinary = async (uri) => {
  if (!uri) return null;

  const filename = uri.split('/').pop();
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image`;

  const fileToUpload = {
    uri: uri,
    name: filename,
    type: type, 
  };
  
  const formData = new FormData();
  formData.append('file', fileToUpload); 
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  try {
    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cloudinary API Error Details:', errorData);
      throw new Error(`Cloudinary upload failed with status ${response.status}: ${errorData.error.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw new Error(error.message || 'Image upload failed. Please check your Cloudinary configuration.');
  }
};