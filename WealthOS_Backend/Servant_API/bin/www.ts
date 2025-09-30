import app, { PORT } from "#app.js";
import ora from 'ora'


app.listen(PORT, () => {
    const baseMessage = `SERVANT API Listening for requests at port ${PORT}`;
    const spinner = ora({
        hideCursor: true,
    }).start();

    let dots = '...';
    let direction = -1;

    const animateDots = () => {
        if (dots.length === 0) {
            direction = 1;
        } else if (dots.length === 3) {
            direction = -1;
        }

        dots = direction === 1 ? dots + '.' : dots.slice(0, -1);
        spinner.text = baseMessage + dots;
    };

    setInterval(animateDots, 200);
});

process.on('SIGINT', () => {
    process.exit(1);
})

