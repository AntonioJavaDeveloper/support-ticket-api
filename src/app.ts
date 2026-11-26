import express from 'express';

const app = express();

app.get('/', (_req, res) => {
    res.status(200).json({
        message: 'My first API with Express 5 and TypeScript 6!',
    });
});

export { app };
