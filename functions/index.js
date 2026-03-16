const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

initializeApp();

// Lee la plantilla UNA sola vez al arrancar
const template = fs.readFileSync(path.join(__dirname, "detalle.html"), "utf8");

exports.ogRenderer = onRequest(
    { invoker: "public" },
    async (req, res) => {
        const articleId = req.query.id;

        // Valores por defecto
        let og = {
            title: "Deriva Jurídico | Formando doctrina, proyectando futuro",
            description: "Plataforma colaborativa de publicaciones jurídicas en Derecho Civil y Arbitraje en el Perú.",
            image: "https://derivajuridico.com/img/vpindex.jpg",
            url: "https://derivajuridico.com/",
            author: "",
            keywords: "derecho civil, arbitraje, jurídico",
        };

        if (articleId) {
            try {
                const db = getFirestore();
                const doc = await db.collection("articulos").doc(articleId).get();

                if (doc.exists) {
                    const d = doc.data();
                    og = {
                        title: d.titulo ? `${d.titulo} | Deriva Jurídico` : og.title,
                        description: d.resumen ? d.resumen.substring(0, 160) : og.description,
                        image: d.imagenUrl || og.image,
                        url: `https://derivajuridico.com/detalle.html?id=${articleId}`,
                        author: d.autorNombre || "",
                        keywords: d.subtitulos ? d.subtitulos.join(", ") : og.keywords,
                    };
                }
            } catch (err) {
                console.error("Firestore error:", err);
            }
        }

        // Inyecta los valores en la plantilla reemplazando los placeholders
        const html = template
            .replace(/__OG_TITLE__/g, e(og.title))
            .replace(/__OG_DESCRIPTION__/g, e(og.description))
            .replace(/__OG_IMAGE__/g, e(og.image))
            .replace(/__OG_URL__/g, e(og.url))
            .replace(/__OG_AUTHOR__/g, e(og.author))
            .replace(/__OG_KEYWORDS__/g, e(og.keywords));

        res.set("Cache-Control", "public, max-age=300, s-maxage=600");
        res.status(200).send(html);
    }
);

function e(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}