async function listModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyCHhgkBilg26n4MYhVULib5QOjZVoUrARA`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(m.name));
        } else {
            console.log("No models found or error in response:");
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
