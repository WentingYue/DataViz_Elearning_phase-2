// real-time calculation
function aggregate(array) {
    var obj = {};
    array.forEach(function (val) {
        if (!obj[val])
            obj[val] = 1;
        else
            obj[val]++;
    });
    return obj;
}

function aggregateScore(array, score) {
    var obj = {};
    array.forEach(function (val) {
        if (!obj[val.key])
            obj[val.key] = val[score];
        else
            obj[val.key] = val[score] + obj[val.key];
    });
    return obj;
}

// normalize degree into 0-1
function normalize(val, max, min) {
    return (val - min) / (max - min);
}

// find unique position level
function uniqueArray(a) {
    return [...new Set(a)];
}

