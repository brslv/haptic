class FileUploadService {
  upload(file, onUploadProgress) {
    let formData = new FormData();

    formData.append("image", file);

    return window.axios.post("/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress,
    });
  }
}

export default new FileUploadService();
