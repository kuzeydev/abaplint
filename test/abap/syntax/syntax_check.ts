import {expect} from "chai";
import {MemoryFile} from "../../../src/files";
import {Registry} from "../../../src/registry";
import {CheckVariables} from "../../../src/abap/syntax/check_variables";
import {Issue} from "../../../src/issue";

function runClass(abap: string): Issue[] {
  const file = new MemoryFile("zcl_foobar.clas.abap", abap);
  const reg = new Registry().addFile(file).parse();
  return new CheckVariables().run(reg.getABAPFiles()[0], reg);
}

function runProgram(abap: string): Issue[] {
  const file = new MemoryFile("zfoobar.prog.abap", abap);
  const reg = new Registry().addFile(file).parse();
  return new CheckVariables().run(reg.getABAPFiles()[0], reg);
}

describe("Syntax Check", () => {
  it("parser error", () => {
    const issues = runClass("asdf sdfs");
    expect(issues.length).to.equals(0);
  });

  it("program, variable foobar not found", () => {
    const abap = "WRITE foobar.\n";
    const issues = runProgram(abap);
    expect(issues.length).to.equals(1);
    expect(issues[0].getMessage()).to.equal("\"foobar\" not found");
  });

  it("program, foobar found", () => {
    const abap = "DATA foobar.\nWRITE foobar.\n";
    const issues = runProgram(abap);
    expect(issues.length).to.equals(0);
  });

  it("program, constant", () => {
    const abap = "CONSTANTS foobar TYPE c VALUE 'B'.\nWRITE foobar.\n";
    const issues = runProgram(abap);
    expect(issues.length).to.equals(0);
  });

  it("program, foobar found, typed", () => {
    const abap = "DATA foobar TYPE c LENGTH 1.\nWRITE foobar.\n";
    const issues = runProgram(abap);
    expect(issues.length).to.equals(0);
  });

  it("program, variable foobar not found, target", () => {
    const abap = "foobar = 2.\n";
    const issues = runProgram(abap);
    expect(issues.length).to.equals(1);
    expect(issues[0].getMessage()).to.equal("\"foobar\" not found");
  });

  it("program, foobar found, target", () => {
    const abap = "DATA foobar.\nfoobar = 2.\n";
    const issues = runProgram(abap);
    expect(issues.length).to.equals(0);
  });

  it("program, abap_true", () => {
    const abap = "WRITE abap_true.\nWRITE ABAP_TRUE.\n";
    const issues = runProgram(abap);
    expect(issues.length).to.equals(0);
  });

  it("program, sy field", () => {
    const abap = "WRITE sy-uname.\nWRITE SY-UNAME.\n";
    const issues = runProgram(abap);
    expect(issues.length).to.equals(0);
  });
/*
  it("program, sy field, unknown field", () => {
    const abap = "WRITE sy-fooboo.\n";
    const issues = runProgram(abap);
    expect(issues.length).to.equals(1);
  });
*/
  it("program, different scope", () => {
    const abap = "FORM foobar1.\n" +
      "  DATA moo.\n" +
      "ENDFORM.\n" +
      "FORM foobar2.\n" +
      "  WRITE moo.\n" +
      "ENDFORM.\n";
    const issues = runProgram(abap);
    expect(issues.length).to.equals(1);
    expect(issues[0].getMessage()).to.equal("\"moo\" not found");
  });

  it("program, global scope", () => {
    const abap = "DATA moo.\n" +
      "FORM foo.\n" +
      "  WRITE moo.\n" +
      "ENDFORM.\n";
    const issues = runProgram(abap);
    expect(issues.length).to.equals(0);
  });
/*
  it("program, FORM parameter", () => {
    const file = new MemoryFile("zfoobar.prog.abap", "FORM foo USING boo.\n" +
      "WRITE boo.\n" +
      "ENDFORM.\n");
    const reg = new Registry().addFile(file).parse();
    const issues = runProgram();
    expect(issues.length).to.equals(0);
  });
*/
  it("class, simple, no errors", () => {
    const abap = "CLASS zcl_foobar DEFINITION PUBLIC FINAL CREATE PUBLIC.\n" +
      "  PUBLIC SECTION.\n" +
      "    METHODS hello.\n" +
      "ENDCLASS.\n" +
      "CLASS zcl_foobar IMPLEMENTATION.\n" +
      "  METHOD hello.\n" +
      "  ENDMETHOD.\n" +
      "ENDCLASS.";
    const issues = runClass(abap);
    expect(issues.length).to.equals(0);
  });

  it("class, variable foobar not found", () => {
    const abap = "CLASS zcl_foobar DEFINITION PUBLIC FINAL CREATE PUBLIC.\n" +
      "  PUBLIC SECTION.\n" +
      "    METHODS hello.\n" +
      "ENDCLASS.\n" +
      "CLASS zcl_foobar IMPLEMENTATION.\n" +
      "  METHOD hello.\n" +
      "    WRITE foobar.\n" +
      "  ENDMETHOD.\n" +
      "ENDCLASS.";
    const issues = runClass(abap);
    expect(issues.length).to.equals(1);
    expect(issues[0].getMessage()).to.equal("\"foobar\" not found");
  });

  it("class, foobar, local variable", () => {
    const abap =
      "CLASS zcl_foobar DEFINITION PUBLIC FINAL CREATE PUBLIC.\n" +
      "  PUBLIC SECTION.\n" +
      "    METHODS hello.\n" +
      "ENDCLASS.\n" +
      "CLASS zcl_foobar IMPLEMENTATION.\n" +
      "  METHOD hello.\n" +
      "    DATA foobar.\n" +
      "    WRITE foobar.\n" +
      "  ENDMETHOD.\n" +
      "ENDCLASS.";
    const issues = runClass(abap);
    expect(issues.length).to.equals(0);
  });

  it("class, importing variable", () => {
    const abap =
      "CLASS zcl_foobar DEFINITION PUBLIC FINAL CREATE PUBLIC.\n" +
      "  PUBLIC SECTION.\n" +
      "    METHODS hello IMPORTING foobar TYPE c.\n" +
      "ENDCLASS.\n" +
      "CLASS zcl_foobar IMPLEMENTATION.\n" +
      "  METHOD hello.\n" +
      "    WRITE foobar.\n" +
      "  ENDMETHOD.\n" +
      "ENDCLASS.";
    const issues = runClass(abap);
    expect(issues.length).to.equals(0);
  });

  it("class, method not found, must push scope", () => {
    const abap =
      "CLASS zcl_foobar DEFINITION PUBLIC FINAL CREATE PUBLIC.\n" +
      "  PUBLIC SECTION.\n" +
      "ENDCLASS.\n" +
      "CLASS zcl_foobar IMPLEMENTATION.\n" +
      "  METHOD hello.\n" +
      "    WRITE foobar.\n" +
      "  ENDMETHOD.\n" +
      "ENDCLASS.";
    const issues = runClass(abap);
    expect(issues.length).to.equals(2);
  });

  it("class, attribute", () => {
    const abap =
      "CLASS zcl_foobar DEFINITION PUBLIC FINAL CREATE PUBLIC.\n" +
      "  PUBLIC SECTION.\n" +
      "    DATA foobar TYPE c.\n" +
      "    METHODS hello.\n" +
      "ENDCLASS.\n" +
      "CLASS zcl_foobar IMPLEMENTATION.\n" +
      "  METHOD hello.\n" +
      "    WRITE foobar.\n" +
      "  ENDMETHOD.\n" +
      "ENDCLASS.";
    const issues = runClass(abap);
    expect(issues.length).to.equals(0);
  });

  it("class, constant", () => {
    const abap =
      "CLASS zcl_foobar DEFINITION PUBLIC FINAL CREATE PUBLIC.\n" +
      "  PUBLIC SECTION.\n" +
      "    CONSTANTS foobar TYPE c VALUE 'B'.\n" +
      "    METHODS hello.\n" +
      "ENDCLASS.\n" +
      "CLASS zcl_foobar IMPLEMENTATION.\n" +
      "  METHOD hello.\n" +
      "    WRITE foobar.\n" +
      "  ENDMETHOD.\n" +
      "ENDCLASS.";
    const issues = runClass(abap);
    expect(issues.length).to.equals(0);
  });

// todo, test both Source and Target

// class variable
// local variable
// method parameter

// static method cannot access instance attributes

// can a private method acces protected attributes?

// upper case vs lower case

// todo, write protected fields

});