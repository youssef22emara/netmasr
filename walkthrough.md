# Netra Full-Stack implementation Walkthrough

## What was built
I have successfully transitioned the original static Netra concept into a fully structural, scalable backend+frontend monolithic web application setup, mirroring real production workflows.

- **Clean Structure**: The directory is now split nicely.
  - `/client`: Holds `index.html`, `submit.html`, `track.html`, `/css`, `/js`, and static assets safely decoupled from sensitive data.
  - `/server`: Holds the Node `server.js` framework router mapping, `/models`, `/controllers`, and `/routes`.
- **MongoDB Schema**: Setup a robust system handling missing values, enumerations for explicit choices, and boolean `refusedNumber` flags.
- **Auto-generated Dynamic Tracking**: A `pre('save')` hook natively checks the MongoDB documents mapped to the current `year`, appending padding intelligently (e.g. `NETRA-2026-000001`).
- **REST APIs**: Full suite of endpoints spanning `POST /api/complaints`, `GET /api/complaints/track/:id`, and `GET /api/complaints/stats`. Real JSON is yielded immediately. Integrates n8n asynchronous webhook stubs nicely.
- **Dynamic Frontend Dashboards**: Inserted `Chart.js` components into the primary index.html dashboard, allowing `api.js` background fetches to instantly re-paint the canvas live depending on exact Mongo inputs.

## Setup Instructions
To run this application locally, you just need Node.js and MongoDB installed:

1. **Start MongoDB**: Make sure your local MongoDB instance (`mongodb://localhost:27017`) is running, or attach a remote Atlas Database inside a `.env` file using the variable `MONGO_URI`.
2. **Open Terminal in `/NETRA`**: I have already initialized the `package.json` and handled `npm install` for critical components (express, mongoose, dotenv, cors).
3. **Run Application**:
   - Simply run `npm start`
4. **Access Platform**: 
   - Open your browser to `http://localhost:3000`. You will be met with the Netra homepage dashboard. Test submitting complaints! The generated Tracking ID can be immediately plugged into the tracking form.
