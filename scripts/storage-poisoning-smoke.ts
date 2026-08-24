import assert from 'node:assert/strict';
import { FACTORY_RECIPES, SHOGUN_PRODUCTS } from '../src/data';
import { rehydratePersistedState } from '../src/store';
import { ApplicationMethod, GrowthStage, Medium, MixingRole, WaterType } from '../src/types';

const factorySilicon = SHOGUN_PRODUCTS.find(product => product.id === 'silicon');
assert.ok(factorySilicon);
const factoryVegRecipe = FACTORY_RECIPES.find(recipe => recipe.id === 'rec-terra-veg-early');
assert.ok(factoryVegRecipe);

const poisoned = JSON.stringify({
  stateVersion: 3,
  currentMedium: Medium.TERRA,
  currentWaterProfile: WaterType.HARD,
  inventory: [
    {
      ...factorySilicon,
      name: 'EVIL SILICON',
      brand: 'ATTACKER',
      mixingRole: MixingRole.BASE,
      remainingCapacity: 999999999,
    },
    {
      id: 'custom-overfilled',
      name: 'Custom overfilled',
      brand: 'ATTACKER',
      initialCapacity: 10,
      remainingCapacity: 999,
      unit: 'ml',
      foliarAllowed: true,
      compatibleMedia: [Medium.TERRA],
      type: 'ADDITIVE',
      mixingRole: MixingRole.SILICON,
    },
    {
      id: 'custom-valid',
      name: 'Custom valid',
      brand: 'ATTACKER',
      initialCapacity: 100,
      remainingCapacity: 50,
      unit: 'ml',
      foliarAllowed: true,
      compatibleMedia: [Medium.TERRA],
      type: 'ADDITIVE',
      mixingRole: MixingRole.SILICON,
    },
  ],
  recipes: [
    {
      ...factoryVegRecipe,
      name: 'POISONED FACTORY RECIPE',
      verificationStatus: 'VERIFIED',
      isFactory: true,
      source: 'ATTACKER',
      ingredients: [{ productId: 'silicon', concentration: 999, mixOrder: 999 }],
    },
    {
      id: 'custom-poisoned-recipe',
      name: 'Custom poisoned recipe',
      medium: [Medium.TERRA],
      method: ApplicationMethod.ROOT_FEED,
      stage: GrowthStage.VEG,
      ingredients: [
        { productId: 'katana-roots', concentration: 0.2, mixOrder: 1 },
        { productId: 'silicon', concentration: 1, mixOrder: 999 },
      ],
      source: 'ATTACKER',
      verificationStatus: 'VERIFIED',
      isFactory: true,
    },
  ],
  history: [
    {
      id: 'bad-history',
      date: 'now',
      volume: Number.MAX_SAFE_INTEGER,
      method: ApplicationMethod.ROOT_FEED,
      doses: { silicon: Number.MAX_SAFE_INTEGER },
      totalMl: Number.MAX_SAFE_INTEGER,
    },
  ],
});

const state = rehydratePersistedState(poisoned);

const silicon = state.inventory.find(product => product.id === 'silicon');
assert.ok(silicon);
assert.equal(silicon.name, factorySilicon.name, 'persisted JSON cannot rename factory products');
assert.equal(silicon.brand, factorySilicon.brand);
assert.equal(silicon.mixingRole, MixingRole.SILICON, 'persisted JSON cannot mutate factory mixing authority');
assert.equal(silicon.remainingCapacity, silicon.initialCapacity, 'factory inventory cannot exceed physical initial capacity');

assert.equal(state.inventory.some(product => product.id === 'custom-overfilled'), false, 'physically impossible custom stock must be rejected');
const customProduct = state.inventory.find(product => product.id === 'custom-valid');
assert.ok(customProduct);
assert.equal(customProduct.mixingRole, undefined, 'persisted custom product cannot inject privileged mixing metadata');

const protectedFactoryRecipe = state.recipes.find(recipe => recipe.id === factoryVegRecipe.id);
assert.ok(protectedFactoryRecipe);
assert.equal(protectedFactoryRecipe.name, factoryVegRecipe.name, 'persisted recipe cannot replace factory recipe');
assert.equal(protectedFactoryRecipe.source, factoryVegRecipe.source);
assert.equal(protectedFactoryRecipe.verificationStatus, factoryVegRecipe.verificationStatus);
assert.equal(protectedFactoryRecipe.isFactory, true);

const customRecipe = state.recipes.find(recipe => recipe.id === 'custom-poisoned-recipe');
assert.ok(customRecipe);
assert.equal(customRecipe.verificationStatus, 'UNVERIFIED', 'VERIFIED is a privilege and cannot come from storage');
assert.equal(customRecipe.isFactory, false, 'custom JSON cannot self-declare factory authority');

assert.equal(state.history.length, 0, 'malformed/extreme history must be dropped');

console.log('storage poisoning smoke: PASS');
