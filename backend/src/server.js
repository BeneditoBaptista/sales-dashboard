require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 3006;

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});