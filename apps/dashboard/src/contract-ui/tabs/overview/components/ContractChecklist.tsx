import { thirdwebClient } from "@/constants/client";
import {
  useIsAdmin,
  useIsMinter,
} from "@3rdweb-sdk/react/hooks/useContractRoles";
import { useBatchesToReveal, useClaimConditions } from "@thirdweb-dev/react";
import type { SmartContract } from "@thirdweb-dev/sdk";
import { detectFeatures } from "components/contract-components/utils";
import { StepsCard } from "components/dashboard/StepsCard";
import { useTabHref } from "contract-ui/utils";
import { useV5DashboardChain } from "lib/v5-adapter";
import { getContract } from "thirdweb";
import { totalSupply } from "thirdweb/extensions/erc20";
import {
  getNFTs as erc721GetNfts,
  getTotalClaimedSupply,
  sharedMetadata,
} from "thirdweb/extensions/erc721";
import { getNFTs as erc1155Nfts } from "thirdweb/extensions/erc1155";
import { getAccounts } from "thirdweb/extensions/erc4337";
import { useReadContract } from "thirdweb/react";
import { Link, Text } from "tw-components";

interface ContractChecklistProps {
  contract: SmartContract;
}

type Step = {
  title: string;
  children: React.ReactNode;
  completed: boolean;
};

export const ContractChecklist: React.FC<ContractChecklistProps> = ({
  contract,
}) => {
  const chain = useV5DashboardChain(contract.chainId);
  const contractv5 = getContract({
    address: contract.getAddress(),
    chain: chain,
    client: thirdwebClient,
  });
  const nftHref = useTabHref("nfts");
  const tokenHref = useTabHref("tokens");
  const accountsHref = useTabHref("accounts");
  const claimConditionsHref = useTabHref("claim-conditions");

  const erc721Claimed = useReadContract(getTotalClaimedSupply, {
    contract: contractv5,
  });
  const erc20Supply = useReadContract(totalSupply, { contract: contractv5 });
  const accounts = useReadContract(getAccounts, {
    contract: contractv5,
    start: 0n,
    end: 1n,
  });
  const erc721NftQuery = useReadContract(erc721GetNfts, {
    contract: contractv5,
    start: 0,
    count: 1,
  });
  const erc1155NftQuery = useReadContract(erc1155Nfts, {
    contract: contractv5,
    start: 0,
    count: 1,
  });
  const sharedMetadataQuery = useReadContract(sharedMetadata, {
    contract: contractv5,
  });

  const claimConditions = useClaimConditions(contract);
  const batchesToReveal = useBatchesToReveal(contract);

  const steps: Step[] = [
    {
      title: "Contract deployed",
      children: null,
      completed: true,
    },
  ];

  const isAdmin = useIsAdmin(contractv5);
  const isMinter = useIsMinter(contractv5);

  if (!isAdmin) {
    return null;
  }

  const isLazyMintable = detectFeatures(contract, [
    "ERC721LazyMintable",
    "ERC1155LazyMintableV2",
    "ERC1155LazyMintableV1",
  ]);
  if (isLazyMintable && isMinter) {
    steps.push({
      title: "First NFT uploaded",
      children: (
        <Text size="body.sm">
          Head to the{" "}
          <Link href={nftHref} color="blue.500">
            NFTs tab
          </Link>{" "}
          to upload your NFT metadata.
        </Text>
      ),
      // can be either 721 or 1155
      completed:
        (erc721NftQuery.data?.length || erc1155NftQuery.data?.length || 0) > 0,
    });
  }

  const isErc721SharedMetadadata = detectFeatures(contract, [
    "ERC721SharedMetadata",
  ]);
  if (isErc721SharedMetadadata) {
    steps.push({
      title: "Set NFT Metadata",
      children: (
        <Text size="label.sm">
          Head to the{" "}
          <Link href={nftHref} color="blue.500">
            NFTs tab
          </Link>{" "}
          to set your NFT metadata.
        </Text>
      ),
      completed: !!sharedMetadataQuery?.data,
    });
  }

  const erc721hasClaimConditions = detectFeatures(contract, [
    "ERC721ClaimPhasesV1",
    "ERC721ClaimPhasesV2",
    "ERC721ClaimConditionsV1",
    "ERC721ClaimConditionsV2",
    "ERC721ClaimCustom",
  ]);
  const erc20HasClaimConditions = detectFeatures(contract, [
    "ERC20ClaimPhasesV1",
    "ERC20ClaimPhasesV2",
    "ERC20ClaimConditionsV1",
    "ERC20ClaimConditionsV2",
  ]);
  if (erc721hasClaimConditions || erc20HasClaimConditions) {
    steps.push({
      title: "Set Claim Conditions",
      children: (
        <Text size="label.sm">
          Head to the{" "}
          <Link href={claimConditionsHref} color="blue.500">
            Claim Conditions tab
          </Link>{" "}
          to set your claim conditions. Users will be able to claim your drop
          only if a claim phase is active.
        </Text>
      ),
      completed:
        (claimConditions.data?.length || 0) > 0 ||
        (erc721Claimed.data || 0n) > 0n ||
        (erc20Supply.data || 0n) > 0n,
    });
  }
  if (erc721hasClaimConditions) {
    steps.push({
      title: "First NFT claimed",
      children: <Text size="label.sm">No NFTs have been claimed so far.</Text>,
      completed: (erc721Claimed.data || 0n) > 0n,
    });
  }

  if (erc20HasClaimConditions) {
    steps.push({
      title: "First token claimed",
      children: (
        <Text size="label.sm">No tokens have been claimed so far.</Text>
      ),
      completed: (erc20Supply.data || 0n) > 0n,
    });
  }

  const tokenIsMintable = detectFeatures(contract, ["ERC20Mintable"]);
  if (tokenIsMintable && isMinter) {
    steps.push({
      title: "First token minted",
      children: (
        <Text size="label.sm">
          Head to the{" "}
          <Link href={tokenHref} color="blue.500">
            token tab
          </Link>{" "}
          to mint your first token.
        </Text>
      ),
      completed: (erc20Supply.data || 0n) > 0n,
    });
  }

  const nftIsMintable = detectFeatures(contract, [
    "ERC721Mintable",
    "ERC1155Mintable",
  ]);
  if (nftIsMintable && isMinter) {
    steps.push({
      title: "First NFT minted",
      children: (
        <Text size="label.sm">
          Head to the{" "}
          <Link href={nftHref} color="blue.500">
            NFTs tab
          </Link>{" "}
          to mint your first token.
        </Text>
      ),
      // can be either 721 or 1155
      completed:
        (erc721NftQuery.data?.length || erc1155NftQuery.data?.length || 0) > 0,
    });
  }

  const isAccountFactory = detectFeatures(contract, ["AccountFactory"]);
  if (isAccountFactory) {
    steps.push({
      title: "First account created",
      children: (
        <Text size="label.sm">
          Head to the{" "}
          <Link href={accountsHref} color="blue.500">
            Accounts tab
          </Link>{" "}
          to create your first account.
        </Text>
      ),
      completed: (accounts.data?.length || 0) > 0,
    });
  }

  const isRevealable = detectFeatures(contract, [
    "ERC721Revealable",
    "ERC1155Revealable",
  ]);
  const needsReveal = batchesToReveal.data?.length;
  if (isRevealable && needsReveal) {
    steps.push({
      title: "NFTs revealed",
      children: (
        <Text size="label.sm">
          Head to the{" "}
          <Link href={nftHref} color="blue.500">
            NFTs tab
          </Link>{" "}
          to reveal your NFTs.
        </Text>
      ),
      // This is always false because if there are batches to reveal, the step doesn't show.
      completed: false,
    });
  }

  if (steps.length === 1) {
    return null;
  }

  return <StepsCard title="Contract checklist" steps={steps} delay={1000} />;
};
