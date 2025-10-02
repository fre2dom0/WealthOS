import app, { PORT } from "./app.js";

app.listen(PORT, () => {
    console.log(`SERVANT API Listening for requests at port ${PORT}`);
});


