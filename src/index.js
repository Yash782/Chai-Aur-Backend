import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path: "./env",
});

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 3000, () => {
            console.log(`Server started at port: ${process.env.PORT}`);
        });
    })
    .catch((err) => console.log("MongoDB Connection failed!!! ", err));
/*
(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("Error", (error) => {
            console.log("Error", error);
            throw error;
        });
        app.listen(process.env.PORT, () => {
            console.log(`App is listing on port ${process.env.PORT}`);
        });
    } catch (error) {
        console.error("Error: ", error);
        throw err;
    }
})();
*/
