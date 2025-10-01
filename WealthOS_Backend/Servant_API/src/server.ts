import app, { PORT } from "./app.js";
import ora, { type Ora } from 'ora'

let animationInterval: NodeJS.Timeout | null = null;
let isSpinnerStopped: boolean = false;
export const spinner = ora({
    hideCursor: true,
})

export const closeSpinner = () => {
    if (!isSpinnerStopped) {
        spinner.stopAndPersist();
        spinner.text = '';
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
    
        isSpinnerStopped = true;
    }
}

app.listen(PORT, () => {
    const baseMessage = `SERVANT API Listening for requests at port ${PORT}`;
    spinner.start();

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

    animationInterval = setInterval(animateDots, 200);
});

process.on('SIGINT', () => {
    process.exit(1);
})

