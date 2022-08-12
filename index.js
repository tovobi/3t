import _ from 'lodash';
import { DataObjectParser } from './modules/dataobject-parser.js';
import { testFunc } from './modules/test.js';
import { readFile } from 'fs/promises';

const tokenJson = JSON.parse(await readFile(new URL('./tokeninput/designtokens.json', import.meta.url)));
console.log('\n\n\n\n\n\n\n\n-----------------------------------------------------------------------------------------\n');

const tokenSets = Object.keys(tokenJson).filter((set) => set != '$themes');
let allValues = [];
function objToDot(obj, depth = 0, parent = '', constructingObj = Object) {
    let themes = [];
    let currentTheme;
    for (var keyName in obj) {
        let currentPath;
        // Der Objectpfad ohne root elemente aka themes (global, "$themes", dark, light,etc,)
        //console.log('currenttheme:', currentTheme, '  depth:');

        if (depth === 0) {
            themes.push(keyName);
            currentTheme = keyName;
            //console.log('currenttheme:', currentTheme, '  depth:', depth);
        } else if (depth === 1) {
            currentPath = keyName;
        } else if (depth > 1) {
            currentPath = parent + '.' + keyName;
        }
        //console.log('currenttheme:', currentTheme, '  depth:', depth);
        if (!constructingObj) {
            constructingObj = { [keyName]: obj[keyName] };
        } else {
            constructingObj.assign({ [keyName]: obj[keyName] });
        }
        // wenn ein teheme gesetzt ist (imme rnur bei depth 0, dann füge es als neues obj dem array hinzu)
        if (currentTheme) {
            allValues.push({ theme: currentTheme });
        }

        // Ist die value ein weiteres obj oder ist hier der Zweig zu Ende?
        if (obj[keyName] instanceof Object) {
            objToDot(obj[keyName], depth + 1, currentPath, constructingObj);
        } else {
            allValues.push({ [currentPath]: obj[keyName] });
        }
    }
    return { themes, allValues };
}

// function objToDot(obj, depth = 0, parent = '', constructingObj = Object) {
//     for (var keyName in obj) {
//         let currentPath;
//         // Der Objectpfad ohne root elemente aka themes (global, "$themes", dark, light,etc,)
//         if (depth === 1) {
//             currentPath = keyName;
//         } else if (depth > 1) {
//             currentPath = parent + '.' + keyName;
//         }

//         if (!constructingObj) {
//             constructingObj = { [keyName]: obj[keyName] };
//         } else {
//             constructingObj.assign({ [keyName]: obj[keyName] });
//         }

//         if (obj[keyName] instanceof Object && !obj[keyName].value) {
//             objToDot(obj[keyName], depth + 1, currentPath, constructingObj);
//         } else {
//             //console.log(obj, "obj[keyName]:", obj[keyName]);
//             allValues.push({ [currentPath]: obj[keyName] });
//         }
//     }
//     return allValues;
// }

const getReferenceName = (reference) => {
    return reference.substr(1, reference.length - 2);
};

const buildExtendedCfg = () => {
    const tokenPaths = printValues(tokenJson);
    var d = new DataObjectParser();
    //console.log(tokenPaths);
    let bigNewObject = {};
    let currentRoot = '';
    let typeOfThisRootSet = false;
    let typeOfThisRoot = '';
    for (let index = 0; index < tokenPaths.length; index++) {
        const tokenPath = tokenPaths[index];

        //console.log(Object.keys(tokenPath), tokenPath[Object.keys(tokenPath)[0]]);
        const tokenPathKey = Object.keys(tokenPath).toString();
        let value = tokenPath[Object.keys(tokenPath)[0]];

        // find references and replace them with the true value
        if (value.includes('{')) {
            const reference = getReferenceName(value);
            tokenPaths.forEach((tokenPath2) => {
                if (Object.keys(tokenPath2).toString() === `${reference}.value`) {
                    value = tokenPath2[Object.keys(tokenPath2)[0]];
                }
            });
        }
        console.log(Object.keys(tokenPath), value);

        d.set(tokenPathKey, value);
        const splittedPath = tokenPathKey.split('.');
        if (currentRoot !== splittedPath[0]) {
            currentRoot = splittedPath[0];
            typeOfThisRootSet = false;
            typeOfThisRoot = console.log('new root:', currentRoot);
        }
        if (!typeOfThisRootSet) {
            if (splittedPath[splittedPath.length - 1] === 'type') {
                console.log('!!type!!:', value);
                switch (splittedPath[splittedPath.length - 1]) {
                    case 'color':
                        bigNewObject = { colors: {} };
                        break;
                    case 'spacing':
                        bigNewObject = { spacing: {} };
                        break;
                    case 'lineheights':
                        bigNewObject = { lineheight: {} };
                        break;
                    case 'sizing':
                        bigNewObject = {
                            width: {},
                            height: {},
                            minWidth: {},
                            minHeight: {},
                        };
                        break;
                    case 'borderRadius':
                        bigNewObject = { borderRadius: {} };
                        break;
                    case 'borderWidth':
                        bigNewObject = { borderWidth: {} };
                        break;
                    case 'opacity':
                        bigNewObject = { opacity: {} };
                        break;
                    case 'boxShadow':
                        bigNewObject = { boxShadow: {} };
                        break;
                    case 'typography':
                        bigNewObject = { fontFamily: {}, fontWeight: {} };
                        break;
                    case 'fontFamilies':
                        bigNewObject = { fontFamily: {} };
                        break;
                    case 'fontWeights':
                        bigNewObject = { fontWeight: {} };
                        break;
                    case 'letterSpacing':
                        bigNewObject = { letterSpacing: {} };
                        break;
                    case 'textCase':
                        bigNewObject = { wipTextTransform: {} };
                        break;
                    case 'textDecoration':
                        bigNewObject = { wipTextDecoration: {} };
                        break;
                    case 'other':
                        bigNewObject = { wipOther: {} };
                        break;
                    default:
                        break;
                }
            }
        }
    }
    var newObj = d.data();
    console.log(newObj, '\n', bigNewObject);
};

const isShadowObj = (lastElement, secondLastElement) => {
    // Special solution for Shadow
    if (
        secondLastElement === 'value' &&
        (lastElement == 'x' ||
            lastElement == 'y' ||
            lastElement == 'blur' ||
            lastElement == 'spread' ||
            lastElement == 'color' ||
            lastElement == 'type')
    ) {
        return true;
    }
};
const getShadowObjectProps = (tokenPath, tokenPaths) => {
    const tokenPathKey = Object.keys(tokenPath).toString();
    const tokenPathElements = tokenPathKey.split('.');
    const noLastElement = tokenPathElements.slice(0, -1).join('.');
    const shadowValue = {
        x: '',
        y: '',
        blur: '',
        spread: '',
        color: '',
        type: '',
    };
    /*
    Das ist das große Obj was nochmal durchgeloopt wird um es mit dem angeblichen Shadowobject abzugleichen.
    Wir müssen an der Stelle noch auswerten. Wir können ja leider im Objektpath nicht zurückgehen,
    deshalb suchen wir uns so die properties, welche auf gleicher Ebene liegen
    */
    tokenPaths.forEach((singleTokenObject) => {
        const singleTokenObjectPathKey = Object.keys(singleTokenObject).toString();
        let singleTokenObjectValue = Object.values(singleTokenObject)[0];
        const singleTokenObjectPathKeyElements = singleTokenObjectPathKey.split('.');
        const singleTokenObjectNoLastElements = singleTokenObjectPathKeyElements.slice(0, -1).join('.');
        const singleTokenObjectLastElement = singleTokenObjectPathKeyElements[singleTokenObjectPathKeyElements.length - 1];
        const keyPath = Object.keys(singleTokenObject)[0];
        if (noLastElement === singleTokenObjectNoLastElements) {
            shadowValue[singleTokenObjectLastElement] = singleTokenObjectValue;
        }
    });
    return `${shadowValue.type === 'innerShadow' ? 'inset' : ''} ${shadowValue.x} ${shadowValue.y} ${shadowValue.blur} ${
        shadowValue.spread
    } ${shadowValue.color}`;
};

const buildCssVariables = (includeType) => {
    includeType = true;
    const dottedObject = objToDot(tokenJson);
    const themes = dottedObject.themes;
    const tokenPaths = dottedObject.allValues;
    var d = new DataObjectParser();
    let cssTokens = [];
    let currentRoot = '';
    let typeOfThisRootSet = false;
    let currentType = '';
    //console.log('tokenPaths:', tokenPaths);
    for (let index = 0; index < tokenPaths.length; index++) {
        let newTokenObj = {};
        const tokenPath = tokenPaths[index];
        console.log('tokenPath:', tokenPath);
        const tokenPathKey = Object.keys(tokenPath).toString();
        let value = tokenPath[Object.keys(tokenPath)[0]];

        const tokenPathElements = tokenPathKey.split('.');
        const noLastElement = tokenPathElements.slice(0, -1).join('.');
        const lastElement = tokenPathElements[tokenPathElements.length - 1];
        const secondLastElement = tokenPathElements[tokenPathElements.length - 2];
        let shadowProps;
        const tokenIsShadow = isShadowObj(lastElement, secondLastElement);

        /*
        wir loopen im Loop nochmal alles durch und schauen ob das 
        Arrayelement einen Type und eine Value hat (hat er eigentlich immer, 
        wir merken uns auf jedenfall den Type wenn im selben rootpath auch 
        ein value ist und diesen Typ übergeben wir dann den großen loop
        */
        if (includeType) {
            let hasValue = false;
            let hasType = false;
            let possibleType = '';
            tokenPaths.forEach((singleTokenObject) => {
                const keyPath = Object.keys(singleTokenObject)[0];

                if (keyPath === `${noLastElement}.type`) {
                    possibleType = Object.values(singleTokenObject)[0];
                    hasType = true;
                }
                if (keyPath === `${noLastElement}.value`) {
                    hasValue = true;
                }

                if (hasValue && hasType && !tokenIsShadow) {
                    currentType = possibleType;
                } else if (tokenIsShadow) {
                    // Sonderlösung für boxShadow auf Grund der behinderten obj-Struktur
                    currentType = 'boxShadow';
                }
            });
        }

        // find references and replace them with the true value
        if (value.includes('{')) {
            const reference = getReferenceName(value);
            tokenPaths.forEach((tokenPath2) => {
                if (Object.keys(tokenPath2).toString() === `${reference}.value`) {
                    value = tokenPath2[Object.keys(tokenPath2)[0]];
                }
            });
        }

        const tokenPathKeys = tokenPathKey.split('.');

        const addToFinalObj = (finalValue) => {
            if (includeType) {
                newTokenObj = {
                    [`--${currentType}-${tokenPathKeys.slice(0, -1).join('-')}`]: finalValue,
                };
            } else {
                newTokenObj = {
                    [`--${tokenPathKeys.slice(0, -1).join('-')}`]: finalValue,
                };
            }
        };

        if (lastElement === 'value') {
            addToFinalObj(value);
        } else if (tokenIsShadow) {
            addToFinalObj(getShadowObjectProps(tokenPath, tokenPaths));
        }

        // entfernt doppelte elemente
        const found = cssTokens.find((element) => {
            if (
                `${Object.keys(element)[0]}|${Object.values(element)[0]}` ===
                `${Object.keys(newTokenObj)[0]}|${Object.values(newTokenObj)[0]}`
            ) {
                return true;
            }
            return false;
        });
        if (!found && Object.keys(newTokenObj).length >= 1) {
            cssTokens.push(newTokenObj);
        }
    }

    console.log(cssTokens);
    console.log('--------\n');
};

const buildCssVariables2 = (includeType) => {
    includeType = true;
    const tokenPaths = objToDot(tokenJson);
    var d = new DataObjectParser();
    //console.log(tokenPaths);
    let bigNewObject = {};
    let currentRoot = '';
    let typeOfThisRootSet = false;
    let typeOfThisRoot = '';
    let currentType;
    for (let index = 0; index < tokenPaths.length; index++) {
        const tokenPath = tokenPaths[index];
        //console.log(tokenPath);
        //console.log(Object.keys(tokenPath), tokenPath[Object.keys(tokenPath)[0]]);

        const tokenPathKey = Object.keys(tokenPath).toString().split('.').slice(0, -1).join('-');

        //console.log(typeof tokenPath, tokenPath, Object.keys(tokenPath)[0]);
        console.log(typeof tokenPath, tokenPath);
        for (var key in tokenPath) {
            console.log(tokenPath[key].value);
        }
        if (Object.keys(tokenPath)[0].value) {
            let value = tokenPath[Object.keys(tokenPath)[0].value];
            console.log(value);
        }

        console.log('--------\n');
    }

    //console.log(newObj, "\n", bigNewObject);
};

buildCssVariables();

// async function f() {
// 	let promise = new Promise((resolve, reject) => {
// 		resolve(printValues(tokenJson));
// 	});

// 	let result = await promise; // wait until the promise resolves (*)

// 	console.log(result); // "done!"
// }

// f();
