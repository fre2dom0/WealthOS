import server from "./app.js";

server.app.listen(server.PORT, () => {
    console.log(`GATEWAY API Listening for requests at port ${server.PORT}`);
});


