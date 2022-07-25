
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

// To parse this data:
//
//   import { Convert, GeneResponseV211 } from "./file";
//
//   const geneResponseV211 = Convert.toGeneResponseV211(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface GeneResponseV211 {
    data: Data;
}

export interface Data {
    gene: Gene;
}

export interface Gene {
    reference_genome:                          string;
    gene_id:                                   string;
    gene_version:                              string;
    symbol:                                    string;
    gencode_symbol:                            string;
    name:                                      string;
    canonical_transcript_id:                   string;
    mane_select_transcript:                    null;
    hgnc_id:                                   string;
    ncbi_id:                                   string;
    omim_id:                                   string;
    chrom:                                     string;
    start:                                     number;
    stop:                                      number;
    strand:                                    string;
    exons:                                     Exon[];
    flags:                                     any[];
    gnomad_constraint:                         GnomadConstraint;
    exac_constraint:                           { [key: string]: number };
    transcripts:                               Transcript[];
    pext:                                      Pext;
    exac_regional_missense_constraint_regions: null;
}

export interface Exon {
    feature_type: string;
    start:        number;
    stop:         number;
}

export interface GnomadConstraint {
    exp_lof:      number;
    exp_mis:      number;
    exp_syn:      number;
    obs_lof:      number;
    obs_mis:      number;
    obs_syn:      number;
    oe_lof:       number;
    oe_lof_lower: number;
    oe_lof_upper: number;
    oe_mis:       number;
    oe_mis_lower: number;
    oe_mis_upper: number;
    oe_syn:       number;
    oe_syn_lower: number;
    oe_syn_upper: number;
    lof_z:        number;
    mis_z:        number;
    syn_z:        number;
    pLI:          number;
    flags:        any[];
}

export interface Pext {
    regions: Region[];
    flags:   any[];
}

export interface Region {
    start:   number;
    stop:    number;
    mean:    number;
    tissues: { [key: string]: number };
}

export interface Transcript {
    transcript_id:          string;
    transcript_version:     string;
    strand:                 string;
    exons:                  Exon[];
    gtex_tissue_expression: { [key: string]: number };
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toGeneResponseV211(json: string): GeneResponseV211 {
        return cast(JSON.parse(json), r("GeneResponseV211"));
    }

    public static geneResponseV211ToJson(value: GeneResponseV211): string {
        return JSON.stringify(uncast(value, r("GeneResponseV211")), null, 2);
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
    "GeneResponseV211": o([
        { json: "data", js: "data", typ: r("Data") },
    ], false),
    "Data": o([
        { json: "gene", js: "gene", typ: r("Gene") },
    ], false),
    "Gene": o([
        { json: "reference_genome", js: "reference_genome", typ: "" },
        { json: "gene_id", js: "gene_id", typ: "" },
        { json: "gene_version", js: "gene_version", typ: "" },
        { json: "symbol", js: "symbol", typ: "" },
        { json: "gencode_symbol", js: "gencode_symbol", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "canonical_transcript_id", js: "canonical_transcript_id", typ: "" },
        { json: "mane_select_transcript", js: "mane_select_transcript", typ: null },
        { json: "hgnc_id", js: "hgnc_id", typ: "" },
        { json: "ncbi_id", js: "ncbi_id", typ: "" },
        { json: "omim_id", js: "omim_id", typ: "" },
        { json: "chrom", js: "chrom", typ: "" },
        { json: "start", js: "start", typ: 0 },
        { json: "stop", js: "stop", typ: 0 },
        { json: "strand", js: "strand", typ: "" },
        { json: "exons", js: "exons", typ: a(r("Exon")) },
        { json: "flags", js: "flags", typ: a("any") },
        { json: "gnomad_constraint", js: "gnomad_constraint", typ: r("GnomadConstraint") },
        { json: "exac_constraint", js: "exac_constraint", typ: m(3.14) },
        { json: "transcripts", js: "transcripts", typ: a(r("Transcript")) },
        { json: "pext", js: "pext", typ: r("Pext") },
        { json: "exac_regional_missense_constraint_regions", js: "exac_regional_missense_constraint_regions", typ: null },
    ], false),
    "Exon": o([
        { json: "feature_type", js: "feature_type", typ: "" },
        { json: "start", js: "start", typ: 0 },
        { json: "stop", js: "stop", typ: 0 },
    ], false),
    "GnomadConstraint": o([
        { json: "exp_lof", js: "exp_lof", typ: 3.14 },
        { json: "exp_mis", js: "exp_mis", typ: 3.14 },
        { json: "exp_syn", js: "exp_syn", typ: 3.14 },
        { json: "obs_lof", js: "obs_lof", typ: 0 },
        { json: "obs_mis", js: "obs_mis", typ: 0 },
        { json: "obs_syn", js: "obs_syn", typ: 0 },
        { json: "oe_lof", js: "oe_lof", typ: 3.14 },
        { json: "oe_lof_lower", js: "oe_lof_lower", typ: 3.14 },
        { json: "oe_lof_upper", js: "oe_lof_upper", typ: 3.14 },
        { json: "oe_mis", js: "oe_mis", typ: 3.14 },
        { json: "oe_mis_lower", js: "oe_mis_lower", typ: 3.14 },
        { json: "oe_mis_upper", js: "oe_mis_upper", typ: 3.14 },
        { json: "oe_syn", js: "oe_syn", typ: 3.14 },
        { json: "oe_syn_lower", js: "oe_syn_lower", typ: 3.14 },
        { json: "oe_syn_upper", js: "oe_syn_upper", typ: 3.14 },
        { json: "lof_z", js: "lof_z", typ: 3.14 },
        { json: "mis_z", js: "mis_z", typ: 3.14 },
        { json: "syn_z", js: "syn_z", typ: 3.14 },
        { json: "pLI", js: "pLI", typ: 3.14 },
        { json: "flags", js: "flags", typ: a("any") },
    ], false),
    "Pext": o([
        { json: "regions", js: "regions", typ: a(r("Region")) },
        { json: "flags", js: "flags", typ: a("any") },
    ], false),
    "Region": o([
        { json: "start", js: "start", typ: 0 },
        { json: "stop", js: "stop", typ: 0 },
        { json: "mean", js: "mean", typ: 3.14 },
        { json: "tissues", js: "tissues", typ: m(3.14) },
    ], false),
    "Transcript": o([
        { json: "transcript_id", js: "transcript_id", typ: "" },
        { json: "transcript_version", js: "transcript_version", typ: "" },
        { json: "strand", js: "strand", typ: "" },
        { json: "exons", js: "exons", typ: a(r("Exon")) },
        { json: "gtex_tissue_expression", js: "gtex_tissue_expression", typ: m(3.14) },
    ], false),
};
