import { jsonrepair } from "jsonrepair";

export function cleanAndParseJSON(jsonString: string): any {
  const cleaned = jsonString.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

  try {
    const repairedJSON = jsonrepair(cleaned);

    return JSON.parse(repairedJSON);
  } catch (error) {
    console.error("Error repairing and parsing JSON:", error);

    return extractPartialData(cleaned);
  }
}

function extractPartialData(jsonString: string): any {
  const result: any = {};
  const keyValueRegex = /"([^"]+)":\s*(?:"([^"]+)"|(\[[^\]]*\])|({[^}]*}))/g;
  let match;

  while ((match = keyValueRegex.exec(jsonString)) !== null) {
    const [, key, stringValue, arrayValue, objectValue] = match;

    if (stringValue) {
      result[key] = stringValue;
    } else if (arrayValue) {
      try {
        result[key] = JSON.parse(arrayValue);
      } catch {
        result[key] = arrayValue;
      }
    } else if (objectValue) {
      try {
        result[key] = JSON.parse(objectValue);
      } catch {
        result[key] = objectValue;
      }
    }
  }

  return result;
}

export const extractJsonObject = (jsonString: string) => {
  const startIndex = jsonString.indexOf("{");
  const endIndex = jsonString.lastIndexOf("}");

  if (startIndex !== -1 && endIndex !== -1) {
    const jsonObjectString = jsonString.substring(startIndex, endIndex + 1);

    return jsonObjectString;
  }

  return null;
};

export const extractJsonObjectStartPoint = (jsonString: string) => {
  const startIndex = jsonString.indexOf("{");

  if (startIndex !== -1) {
    const jsonObjectString = jsonString.substring(startIndex);

    return jsonObjectString;
  }

  return null;
};

export const finalContentExtraction = (shortlistJsonString: string) => {
  let repairedResultJson: any = {};

  try {
    try {
      const levelZero = JSON.parse(shortlistJsonString);

      if (typeof levelZero === "object") {
        return levelZero;
      }
    } catch (error) {}

    // Level 1 Extraction
    repairedResultJson = extractJsonObject(shortlistJsonString);
    repairedResultJson = JSON.parse(jsonrepair(repairedResultJson));

    // Level 2 Extraction (if required)
    if (!repairedResultJson) {
      repairedResultJson = extractJsonObjectStartPoint(shortlistJsonString);
      repairedResultJson = JSON.parse(jsonrepair(repairedResultJson));
    }
  } catch (error) {
    // Level 3 Extraction (if required)
    repairedResultJson = cleanAndParseJSON(shortlistJsonString);
  }

  return repairedResultJson;
};

export function keysToLowerCase(obj: any) {
  var newObj: any = {};

  Object.keys(obj).forEach(function (key) {
    newObj[key?.toLowerCase()] = obj[key];
  });

  return newObj;
}
