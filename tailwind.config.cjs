/** Configuração do Tailwind. O CSS gerado é versionado em css/tailwind.css
 *  para que o painel funcione sem build e sem internet. */
module.exports = {
    darkMode: 'class',
    content: ['./index.html', './js/**/*.js'],
    theme: { extend: {} },
    plugins: []
};
