// script.js
async function uploadImage() {
    const form = document.getElementById('uploadForm');
    const formData = new FormData(form);

    try {
        const response = await axios.post('http://localhost:3000/user/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        console.log('Image upload response:', response.data);

        if (response.data.success) {
            console.log('Image upload successful!');
        }
    } catch (error) {
        console.error('Error during image upload:', error);
    }
}
