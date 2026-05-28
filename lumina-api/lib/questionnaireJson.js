/**
 * Cuestionario en BD: MariaDB antigua no admite tipo JSON nativo.
 * Guardamos JSON como texto (@db.LongText) y parseamos al leer.
 */

function parseQuestionnairePart(value) {
    if (value == null) return null;
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
        const t = value.trim();
        if (t === '') return null;
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    }
    return null;
}

function stringifyQuestionnairePart(value) {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
}

function normalizeQuestionnaireRow(q) {
    if (!q) return null;
    return {
        ...q,
        part1: parseQuestionnairePart(q.part1),
        part2: parseQuestionnairePart(q.part2),
        part3: parseQuestionnairePart(q.part3),
    };
}

module.exports = {
    parseQuestionnairePart,
    stringifyQuestionnairePart,
    normalizeQuestionnaireRow,
};
