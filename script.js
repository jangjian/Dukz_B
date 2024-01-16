function uploadImage() {
    const form = document.getElementById('uploadForm');
    const formData = new FormData(form);

    fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        const resultDiv = document.getElementById('result');
        if (data.success) {
            resultDiv.innerHTML = `<p>${data.message}</p><img src="uploads/${data.image_url}" alt="Uploaded Image">`;
        } else {
            resultDiv.innerHTML = `<p>${data.message}</p>`;
        }
    })
    .catch(error => console.error('Error:', error));
}
