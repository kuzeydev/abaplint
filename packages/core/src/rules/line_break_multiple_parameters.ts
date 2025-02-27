import {Issue} from "../issue";
import {ABAPRule} from "./_abap_rule";
import {BasicRuleConfig} from "./_basic_rule_config";
import * as Expressions from "../abap/2_statements/expressions";
import {IRuleMetadata, RuleTag} from "./_irule";
import {EditHelper} from "../edit_helper";
import {VirtualPosition} from "../position";
import {ABAPFile} from "../abap/abap_file";
import {ABAPObject} from "../objects/_abap_object";

export class LineBreakMultipleParametersConf extends BasicRuleConfig {
  /** Amount of allowed parameters on one line */
  public count: number = 1;
}

export class LineBreakMultipleParameters extends ABAPRule {

  private conf = new LineBreakMultipleParametersConf();

  public getMetadata(): IRuleMetadata {
    return {
      key: "line_break_multiple_parameters",
      title: "Line break multiple parameters",
      shortDescription: `Line break multiple parameters`,
      extendedInformation: `https://github.com/SAP/styleguides/blob/main/clean-abap/CleanABAP.md#line-break-multiple-parameters`,
      badExample: `method( parameter1 = value parameter2 = value ).`,
      goodExample: `method( parameter1 = value\n        parameter2 = value ).`,
      tags: [RuleTag.Whitespace, RuleTag.Styleguide, RuleTag.Quickfix, RuleTag.SingleFile],
    };
  }

  public getConfig() {
    return this.conf;
  }

  public setConfig(conf: LineBreakMultipleParametersConf) {
    this.conf = conf;
  }

  public runParsed(file: ABAPFile, obj: ABAPObject) {
    const issues: Issue[] = [];

    if (obj.getType() === "INTF") {
      return [];
    }

    for (const s of file.getStatements()) {
      for (const e of s.findAllExpressions(Expressions.ParameterListS)) {
        if (s.getFirstToken().getStart() instanceof VirtualPosition) {
          continue; // skip macro content
        }

        const parameters = e.findDirectExpressions(Expressions.ParameterS);
        if (parameters.length <= 1) {
          continue;
        }
        let previous = parameters[0];
        for (let i = 1; i < parameters.length; i++) {
          const current = parameters[i];

          if (this.conf.count && i < this.conf.count) {
            previous = current;
            continue;
          }

          const first = current.getFirstToken();
          if (previous.getFirstToken().getRow() === first.getRow()) {
            const fix = EditHelper.insertAt(file, first.getStart(), "\n" + " ".repeat(parameters[0].getFirstToken().getStart().getCol() - 1));
            issues.push(Issue.atToken(
              file,
              current.getFirstToken(),
              this.getMetadata().title,
              this.getMetadata().key,
              this.conf.severity,
              fix));
          }
          previous = current;
        }

      }
    }

    return issues;
  }

}
