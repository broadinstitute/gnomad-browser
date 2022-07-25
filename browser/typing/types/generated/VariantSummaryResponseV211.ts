
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

// To parse this data:
//
//   import { Convert, VariantSummaryResponseV211 } from "./file";
//
//   const variantSummaryResponseV211 = Convert.toVariantSummaryResponseV211(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface VariantSummaryResponseV211 {
    data: Data;
}

export interface Data {
    meta: Meta;
    gene: Gene;
}

export interface Gene {
    clinvar_variants: ClinvarVariant[];
    variants:         Variant[];
}

export interface ClinvarVariant {
    clinical_significance: string;
    clinvar_variation_id:  string;
    gnomad:                Gnomad;
    gold_stars:            number;
    hgvsc:                 string;
    hgvsp:                 null | string;
    in_gnomad:             boolean;
    major_consequence:     string;
    pos:                   number;
    review_status:         string;
    transcript_id:         string;
    variant_id:            string;
}

export interface Gnomad {
    exome:  GnomadExome | null;
    genome: GnomadExome | null;
}

export interface GnomadExome {
    ac:      number;
    an:      number;
    filters: string[];
}

export interface Variant {
    consequence:        string;
    flags:              string[];
    hgvs:               string;
    hgvsc:              string;
    hgvsp:              null | string;
    lof:                null | string;
    lof_filter:         null | string;
    lof_flags:          null | string;
    pos:                number;
    rsids:              string[];
    transcript_id:      string;
    transcript_version: string;
    variant_id:         string;
    exome:              VariantExome | null;
    genome:             VariantExome | null;
    lof_curation:       LofCuration | null;
}

export interface VariantExome {
    ac:          number;
    ac_hemi:     number;
    ac_hom:      number;
    an:          number;
    af:          number;
    filters:     string[];
    populations: Population[];
}

export interface Population {
    id:      string;
    ac:      number;
    an:      number;
    ac_hemi: number;
    ac_hom:  number;
}

export interface LofCuration {
    verdict: string;
    flags:   string[];
}

export interface Meta {
    clinvar_release_date: Date;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toVariantSummaryResponseV211(json: string): VariantSummaryResponseV211 {
        return cast(JSON.parse(json), r("VariantSummaryResponseV211"));
    }

    public static variantSummaryResponseV211ToJson(value: VariantSummaryResponseV211): string {
        return JSON.stringify(uncast(value, r("VariantSummaryResponseV211")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any = ''): never {
    if (key) {
        throw Error(`Invalid value for key "${key}". Expected type ${JSON.stringify(typ)} but got ${JSON.stringify(val)}`);
    }
    throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`, );
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases, val);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue("array", val);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue("Date", val);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue("object", val);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, prop.key);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val);
    }
    if (typ === false) return invalidValue(typ, val);
    while (typeof typ === "object" && typ.ref !== undefined) {
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "VariantSummaryResponseV211": o([
        { json: "data", js: "data", typ: r("Data") },
    ], false),
    "Data": o([
        { json: "meta", js: "meta", typ: r("Meta") },
        { json: "gene", js: "gene", typ: r("Gene") },
    ], false),
    "Gene": o([
        { json: "clinvar_variants", js: "clinvar_variants", typ: a(r("ClinvarVariant")) },
        { json: "variants", js: "variants", typ: a(r("Variant")) },
    ], false),
    "ClinvarVariant": o([
        { json: "clinical_significance", js: "clinical_significance", typ: "" },
        { json: "clinvar_variation_id", js: "clinvar_variation_id", typ: "" },
        { json: "gnomad", js: "gnomad", typ: r("Gnomad") },
        { json: "gold_stars", js: "gold_stars", typ: 0 },
        { json: "hgvsc", js: "hgvsc", typ: "" },
        { json: "hgvsp", js: "hgvsp", typ: u(null, "") },
        { json: "in_gnomad", js: "in_gnomad", typ: true },
        { json: "major_consequence", js: "major_consequence", typ: "" },
        { json: "pos", js: "pos", typ: 0 },
        { json: "review_status", js: "review_status", typ: "" },
        { json: "transcript_id", js: "transcript_id", typ: "" },
        { json: "variant_id", js: "variant_id", typ: "" },
    ], false),
    "Gnomad": o([
        { json: "exome", js: "exome", typ: u(r("GnomadExome"), null) },
        { json: "genome", js: "genome", typ: u(r("GnomadExome"), null) },
    ], false),
    "GnomadExome": o([
        { json: "ac", js: "ac", typ: 0 },
        { json: "an", js: "an", typ: 0 },
        { json: "filters", js: "filters", typ: a("") },
    ], false),
    "Variant": o([
        { json: "consequence", js: "consequence", typ: "" },
        { json: "flags", js: "flags", typ: a("") },
        { json: "hgvs", js: "hgvs", typ: "" },
        { json: "hgvsc", js: "hgvsc", typ: "" },
        { json: "hgvsp", js: "hgvsp", typ: u(null, "") },
        { json: "lof", js: "lof", typ: u(null, "") },
        { json: "lof_filter", js: "lof_filter", typ: u(null, "") },
        { json: "lof_flags", js: "lof_flags", typ: u(null, "") },
        { json: "pos", js: "pos", typ: 0 },
        { json: "rsids", js: "rsids", typ: a("") },
        { json: "transcript_id", js: "transcript_id", typ: "" },
        { json: "transcript_version", js: "transcript_version", typ: "" },
        { json: "variant_id", js: "variant_id", typ: "" },
        { json: "exome", js: "exome", typ: u(r("VariantExome"), null) },
        { json: "genome", js: "genome", typ: u(r("VariantExome"), null) },
        { json: "lof_curation", js: "lof_curation", typ: u(r("LofCuration"), null) },
    ], false),
    "VariantExome": o([
        { json: "ac", js: "ac", typ: 0 },
        { json: "ac_hemi", js: "ac_hemi", typ: 0 },
        { json: "ac_hom", js: "ac_hom", typ: 0 },
        { json: "an", js: "an", typ: 0 },
        { json: "af", js: "af", typ: 3.14 },
        { json: "filters", js: "filters", typ: a("") },
        { json: "populations", js: "populations", typ: a(r("Population")) },
    ], false),
    "Population": o([
        { json: "id", js: "id", typ: "" },
        { json: "ac", js: "ac", typ: 0 },
        { json: "an", js: "an", typ: 0 },
        { json: "ac_hemi", js: "ac_hemi", typ: 0 },
        { json: "ac_hom", js: "ac_hom", typ: 0 },
    ], false),
    "LofCuration": o([
        { json: "verdict", js: "verdict", typ: "" },
        { json: "flags", js: "flags", typ: a("") },
    ], false),
    "Meta": o([
        { json: "clinvar_release_date", js: "clinvar_release_date", typ: Date },
    ], false),
};
