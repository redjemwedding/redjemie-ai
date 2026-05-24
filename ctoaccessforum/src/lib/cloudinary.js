const CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export async function uploadFile(file, onProgress) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`
  const fd  = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', PRESET)
  fd.append('folder', 'cto-forum')
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    if (onProgress) xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) onProgress(Math.round(e.loaded/e.total*100))
    })
    xhr.onload = () => {
      if (xhr.status === 200) {
        const d = JSON.parse(xhr.responseText)
        resolve({ url: d.secure_url, publicId: d.public_id, bytes: d.bytes })
      } else reject(new Error('Upload failed'))
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(fd)
  })
}
