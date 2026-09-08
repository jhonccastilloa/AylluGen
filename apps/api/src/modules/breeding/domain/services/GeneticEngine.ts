import { Animal } from "../../../animal/domain/entities/Animal";
import { COICalculationResult, RiskLevel } from "../entities/Breeding";

interface AncestorPath {
  generations: number;
  nodes: string[];
}

export class GeneticEngine {
  private readonly maxGenerations = 8;

  constructor() {}

  calculateCOI(
    male: Animal,
    female: Animal,
    pedigree: Map<string, Animal>,
  ): COICalculationResult {
    const inbreedingCache = new Map<string, number>();
    const pairCache = new Map<string, number>();
    const visitingInbreeding = new Set<string>();
    const coi = this.calculateWrightCoefficient(
      male,
      female,
      pedigree,
      inbreedingCache,
      pairCache,
      visitingInbreeding,
    );
    const relationship = Math.min(coi * 2, 1);
    const riskLevel = this.getRiskLevel(coi);

    return {
      coi,
      riskLevel,
      relationship: this.getRelationshipDescription(relationship),
    };
  }

  calculateRelationship(
    male: Animal,
    female: Animal,
    pedigree: Map<string, Animal>,
  ): number {
    const inbreedingCache = new Map<string, number>();
    const pairCache = new Map<string, number>();
    const visitingInbreeding = new Set<string>();
    const coi = this.calculateWrightCoefficient(
      male,
      female,
      pedigree,
      inbreedingCache,
      pairCache,
      visitingInbreeding,
    );
    return Math.min(coi * 2, 1);
  }

  private calculateWrightCoefficient(
    male: Animal,
    female: Animal,
    pedigree: Map<string, Animal>,
    inbreedingCache: Map<string, number>,
    pairCache: Map<string, number>,
    visitingInbreeding: Set<string>,
  ): number {
    const pairKey = this.buildPairKey(male.id, female.id, 1);
    const cached = pairCache.get(pairKey);
    if (cached !== undefined) {
      return cached;
    }

    const malePaths = this.buildAncestorPaths(male, pedigree);
    const femalePaths = this.buildAncestorPaths(female, pedigree);
    const commonAncestorIds = [...malePaths.keys()].filter((id) =>
      femalePaths.has(id),
    );
    let coefficient = 0;

    for (const ancestorId of commonAncestorIds) {
      const ancestorInbreeding = this.getAncestorInbreeding(
        ancestorId,
        pedigree,
        inbreedingCache,
        pairCache,
        visitingInbreeding,
      );
      const maleAncestorPaths = malePaths.get(ancestorId) ?? [];
      const femaleAncestorPaths = femalePaths.get(ancestorId) ?? [];

      for (const malePath of maleAncestorPaths) {
        for (const femalePath of femaleAncestorPaths) {
          if (!this.arePathsIndependent(malePath, femalePath)) {
            continue;
          }

          const contribution = Math.pow(
            0.5,
            malePath.generations + femalePath.generations + 1,
          );
          coefficient += contribution * (1 + ancestorInbreeding);
        }
      }
    }

    const normalized = Math.min(Math.max(coefficient, 0), 1);
    pairCache.set(pairKey, normalized);
    return normalized;
  }

  private getAncestorInbreeding(
    ancestorId: string,
    pedigree: Map<string, Animal>,
    inbreedingCache: Map<string, number>,
    pairCache: Map<string, number>,
    visitingInbreeding: Set<string>,
  ): number {
    const cached = inbreedingCache.get(ancestorId);
    if (cached !== undefined) {
      return cached;
    }

    if (visitingInbreeding.has(ancestorId)) {
      return 0;
    }

    const ancestor = pedigree.get(ancestorId);
    if (!ancestor?.fatherId || !ancestor.motherId) {
      inbreedingCache.set(ancestorId, 0);
      return 0;
    }

    const father = pedigree.get(ancestor.fatherId);
    const mother = pedigree.get(ancestor.motherId);
    if (!father || !mother) {
      inbreedingCache.set(ancestorId, 0);
      return 0;
    }

    visitingInbreeding.add(ancestorId);
    const inbreeding = this.calculateWrightCoefficient(
      father,
      mother,
      pedigree,
      inbreedingCache,
      pairCache,
      visitingInbreeding,
    );
    visitingInbreeding.delete(ancestorId);
    inbreedingCache.set(ancestorId, inbreeding);
    return inbreeding;
  }

  private buildAncestorPaths(
    animal: Animal,
    pedigree: Map<string, Animal>,
  ): Map<string, AncestorPath[]> {
    const byAncestor = new Map<string, Map<string, AncestorPath>>();

    const registerPath = (ancestorId: string, path: AncestorPath): void => {
      let ancestorEntries = byAncestor.get(ancestorId);
      if (!ancestorEntries) {
        ancestorEntries = new Map<string, AncestorPath>();
        byAncestor.set(ancestorId, ancestorEntries);
      }

      ancestorEntries.set(this.buildPathKey(path), path);
    };

    const traverse = (
      currentId: string,
      generations: number,
      nodes: string[],
      visited: Set<string>,
    ): void => {
      if (generations > this.maxGenerations) {
        return;
      }

      registerPath(currentId, { generations, nodes: [...nodes] });
      const current = pedigree.get(currentId);
      if (!current) {
        return;
      }

      const parents = [current.fatherId, current.motherId].filter(
        (parentId): parentId is string => Boolean(parentId),
      );

      for (const parentId of parents) {
        if (visited.has(parentId)) {
          continue;
        }

        const nextNodes =
          currentId === animal.id ? [...nodes] : [...nodes, currentId];
        const nextVisited = new Set(visited);
        nextVisited.add(parentId);
        traverse(parentId, generations + 1, nextNodes, nextVisited);
      }
    };

    traverse(animal.id, 0, [], new Set([animal.id]));

    const result = new Map<string, AncestorPath[]>();
    for (const [ancestorId, paths] of byAncestor.entries()) {
      result.set(ancestorId, [...paths.values()]);
    }
    return result;
  }

  private arePathsIndependent(
    leftPath: AncestorPath,
    rightPath: AncestorPath,
  ): boolean {
    if (leftPath.nodes.length === 0 || rightPath.nodes.length === 0) {
      return true;
    }

    const leftNodes = new Set(leftPath.nodes);
    return !rightPath.nodes.some((nodeId) => leftNodes.has(nodeId));
  }

  private buildPairKey(
    leftAnimalId: string,
    rightAnimalId: string,
    exponentOffset: number,
  ): string {
    const [first, second] = [leftAnimalId, rightAnimalId].sort();
    return `${exponentOffset}:${first}:${second}`;
  }

  private buildPathKey(path: AncestorPath): string {
    return `${path.generations}:${path.nodes.join(">")}`;
  }

  private getRiskLevel(coi: number): RiskLevel {
    const percentage = coi * 100;

    if (percentage < 6.25) {
      return RiskLevel.GREEN;
    } else if (percentage <= 12.5) {
      return RiskLevel.YELLOW;
    } else {
      return RiskLevel.RED;
    }
  }

  private getRelationshipDescription(relationship: number): string {
    const percentage = relationship * 100;

    if (percentage >= 87.5) return "Identical";
    if (percentage >= 50) return "Parent-child or full-siblings";
    if (percentage >= 37.5) return "Three-quarters siblings";
    if (percentage >= 25) return "Grandparent-grandchild or half-siblings";
    if (percentage >= 18.75) return "Three-quarter cousins";
    if (percentage >= 12.5)
      return "Great-grandparent, aunt/uncle, or first cousins";
    if (percentage >= 9.375) return "Half-cousins";
    if (percentage >= 6.25)
      return "First cousins once removed or second cousins";
    if (percentage >= 3.125)
      return "Second cousins once removed or third cousins";
    if (percentage >= 1.5625)
      return "Third cousins once removed or fourth cousins";
    return "Distantly related or unrelated";
  }

  getRecommendation(coi: number, riskLevel: RiskLevel): string {
    const percentage = coi * 100;

    if (riskLevel === RiskLevel.GREEN) {
      return "Safe to breed. Low inbreeding risk.";
    } else if (riskLevel === RiskLevel.YELLOW) {
      return `Proceed with caution. Moderate inbreeding risk (${percentage.toFixed(2)}%). Consider alternative matches if available.`;
    } else {
      return `High risk! Inbreeding coefficient is ${percentage.toFixed(2)}%. Do not proceed with this pairing. Find an unrelated mate.`;
    }
  }
}
