import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("AgentBounty", function () {
  async function deployFixture() {
    const [creator, agent, outsider] = await ethers.getSigners();
    const AgentBounty = await ethers.getContractFactory("AgentBounty");
    const agentBounty = await AgentBounty.deploy();
    const bounty = ethers.parseEther("0.01");

    return { agentBounty, creator, agent, outsider, bounty };
  }

  async function createOpenTask() {
    const fixture = await deployFixture();
    await fixture.agentBounty.connect(fixture.creator).createTask(
      "Analyze Ritual",
      "Write a short research report about Ritual and agent economies.",
      "Research",
      "Structured report with risks and recommendation.",
      0,
      { value: fixture.bounty }
    );

    return fixture;
  }

  it("creates a task and escrows bounty", async function () {
    const { agentBounty, creator, bounty } = await createOpenTask();
    const task = await agentBounty.tasks(1);

    expect(task.creator).to.equal(creator.address);
    expect(task.bounty).to.equal(bounty);
    expect(task.status).to.equal(0);
  });

  it("rejects zero bounty", async function () {
    const { agentBounty, creator } = await deployFixture();

    await expect(
      agentBounty.connect(creator).createTask("Bad", "This description is long enough for validation.", "Other", "", 0)
    ).to.be.revertedWith("Bounty must be greater than zero");
  });

  it("lets an agent accept an open task", async function () {
    const { agentBounty, agent } = await createOpenTask();

    await expect(agentBounty.connect(agent).acceptTask(1)).to.emit(agentBounty, "TaskAccepted");

    const task = await agentBounty.tasks(1);
    expect(task.agent).to.equal(agent.address);
    expect(task.status).to.equal(1);
  });

  it("prevents creator from accepting own task", async function () {
    const { agentBounty, creator } = await createOpenTask();

    await expect(agentBounty.connect(creator).acceptTask(1)).to.be.revertedWith("Creator cannot accept own task");
  });

  it("lets the assigned agent submit a result", async function () {
    const { agentBounty, agent } = await createOpenTask();
    await agentBounty.connect(agent).acceptTask(1);

    await expect(agentBounty.connect(agent).submitResult(1, "Risk score is 72 with liquidity concerns.", ""))
      .to.emit(agentBounty, "ResultSubmitted");

    const task = await agentBounty.tasks(1);
    expect(task.status).to.equal(2);
  });

  it("prevents non-agent result submission", async function () {
    const { agentBounty, agent, outsider } = await createOpenTask();
    await agentBounty.connect(agent).acceptTask(1);

    await expect(
      agentBounty.connect(outsider).submitResult(1, "Outsider result should not be accepted.", "")
    ).to.be.revertedWith("Only assigned agent can submit");
  });

  it("approves task and releases bounty", async function () {
    const { agentBounty, creator, agent, bounty } = await createOpenTask();
    await agentBounty.connect(agent).acceptTask(1);
    await agentBounty.connect(agent).submitResult(1, "Final accepted result text.", "");

    await expect(() => agentBounty.connect(creator).approveTask(1)).to.changeEtherBalances(
      [agentBounty, agent],
      [-bounty, bounty]
    );

    const task = await agentBounty.tasks(1);
    expect(task.status).to.equal(3);
    expect(task.bounty).to.equal(0);
  });

  it("prevents duplicate payment after approval", async function () {
    const { agentBounty, creator, agent } = await createOpenTask();
    await agentBounty.connect(agent).acceptTask(1);
    await agentBounty.connect(agent).submitResult(1, "Final accepted result text.", "");
    await agentBounty.connect(creator).approveTask(1);

    await expect(agentBounty.connect(creator).approveTask(1)).to.be.revertedWith("Task is not submitted");
  });

  it("rejects and allows resubmission", async function () {
    const { agentBounty, creator, agent } = await createOpenTask();
    await agentBounty.connect(agent).acceptTask(1);
    await agentBounty.connect(agent).submitResult(1, "Weak first result.", "");
    await agentBounty.connect(creator).rejectTask(1, "Need stronger risk analysis.");

    await agentBounty.connect(agent).submitResult(1, "Improved result with clearer risks.", "");

    const task = await agentBounty.tasks(1);
    expect(task.status).to.equal(2);
    expect(task.rejectReason).to.equal("");
  });

  it("cancels an open task and refunds creator", async function () {
    const { agentBounty, creator, bounty } = await createOpenTask();

    await expect(() => agentBounty.connect(creator).cancelTask(1)).to.changeEtherBalances(
      [agentBounty, creator],
      [-bounty, bounty]
    );

    const task = await agentBounty.tasks(1);
    expect(task.status).to.equal(5);
  });

  it("prevents cancelling assigned task", async function () {
    const { agentBounty, creator, agent } = await createOpenTask();
    await agentBounty.connect(agent).acceptTask(1);

    await expect(agentBounty.connect(creator).cancelTask(1)).to.be.revertedWith("Only open tasks can be cancelled");
  });

  it("validates rating range", async function () {
    const { agentBounty, creator, agent } = await createOpenTask();
    await agentBounty.connect(agent).acceptTask(1);
    await agentBounty.connect(agent).submitResult(1, "Final accepted result text.", "");
    await agentBounty.connect(creator).approveTask(1);

    await expect(agentBounty.connect(creator).rateAgent(1, 0, "Bad rating")).to.be.revertedWith(
      "Rating must be from 1 to 5"
    );

    await expect(agentBounty.connect(creator).rateAgent(1, 5, "Excellent delivery")).to.emit(
      agentBounty,
      "AgentRated"
    );
  });
});
